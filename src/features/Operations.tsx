import { useState } from "react";
import {
  Plus,
  Download,
  Bell,
  Wrench,
  Package,
  ClipboardList,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../lib/context";
import {
  Badge,
  Dialog,
  Empty,
  Field,
  Heading,
  Table,
  value,
} from "../components/ui";
import { rpc, manageUser } from "../lib/supabase";
import {
  CONDITIONS,
  ROLE_NAMES,
  type Maintenance,
  type Profile,
  type Role,
} from "../lib/types";
import {
  csvContent,
  formatDate,
  isOverdue,
  inSchoolDateRange,
} from "../lib/rules";
export function MaintenancePage() {
  const { data, perform } = useApp();
  const [adding, setAdding] = useState(false);
  const [starting, setStarting] = useState<Maintenance | null>(null);
  const [resolve, setResolve] = useState<Maintenance | null>(null);
  const [filter, setFilter] = useState("Open");
  const rows = data.maintenance
    .filter(
      (m) =>
        filter === "All" ||
        (filter === "Open" ? m.status !== "Resolved" : m.status === "Resolved"),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <Heading
        title="Damage & Maintenance"
        description="Track incidents, repair costs, and equipment recovery."
      >
        <button className="button" onClick={() => setAdding(true)}>
          <Plus size={17} />
          Record incident
        </button>
      </Heading>
      <section className="card">
        <div className="toolbar">
          <select
            aria-label="Maintenance status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["Open", "Resolved", "All"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <span className="muted">{rows.length} records</span>
        </div>
        {rows.length ? (
          <Table
            headers={[
              "Equipment",
              "Incident",
              "Reported",
              "Cost",
              "Status",
              "Resolution / Action",
            ]}
          >
            {rows.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>
                    {data.equipment.find((e) => e.id === m.equipment_id)?.name}
                  </strong>
                  <small>
                    {
                      data.equipment.find((e) => e.id === m.equipment_id)
                        ?.asset_number
                    }
                  </small>
                </td>
                <td className="wrap-cell">{m.incident}</td>
                <td>{formatDate(m.created_at)}</td>
                <td>
                  {Number(m.cost).toLocaleString("en-PH", {
                    style: "currency",
                    currency: "PHP",
                  })}
                </td>
                <td>
                  <Badge value={m.status} />
                </td>
                <td>
                  {m.status === "Resolved" ? (
                    <span className="wrap-cell">{m.resolution}</span>
                  ) : (
                    <div className="actions">
                      {m.status === "Pending" && (
                        <button
                          className="button secondary small"
                          onClick={() => setStarting(m)}
                        >
                          Start repair
                        </button>
                      )}
                      <button
                        className="button green small"
                        onClick={() => setResolve(m)}
                      >
                        Resolve repair
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty title="No maintenance records found" />
        )}
      </section>
      {starting && (
        <Dialog
          title="Start equipment repair"
          onClose={() => setStarting(null)}
          submit="Start repair"
          onSubmit={async () => {
            await perform(
              () => rpc("start_repair", { p_id: starting.id }),
              "Repair started",
            );
          }}
        >
          <p>
            Mark this incident as Under Repair? The asset stays unavailable
            until all repairs are resolved.
          </p>
        </Dialog>
      )}
      {adding && (
        <Dialog
          title="Record damage or incident"
          onClose={() => setAdding(false)}
          submit="Record incident"
          onSubmit={async (f) => {
            await perform(
              () =>
                rpc("record_incident", {
                  p_equipment: value(f, "equipment"),
                  p_incident: value(f, "incident"),
                  p_cost: Number(value(f, "cost")),
                }),
              "Incident recorded",
            );
          }}
        >
          <Field label="Equipment">
            <select name="equipment" required>
              <option value="">Choose equipment</option>
              {data.equipment
                .filter((e) => e.availability !== "Archived")
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.asset_number} — {e.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Describe damage / incident">
            <textarea name="incident" required maxLength={2000} />
          </Field>
          <Field label="Estimated cost (PHP)">
            <input
              name="cost"
              type="number"
              required
              min="0"
              max="9999999999"
              step="0.01"
              defaultValue="0"
            />
          </Field>
          <p className="form-note">
            This makes the asset unavailable. An existing loan must still be
            returned separately.
          </p>
        </Dialog>
      )}
      {resolve && (
        <Dialog
          title="Resolve maintenance"
          onClose={() => setResolve(null)}
          submit="Resolve & confirm condition"
          onSubmit={async (f) => {
            await perform(
              () =>
                rpc("resolve_maintenance", {
                  p_id: resolve.id,
                  p_resolution: value(f, "resolution"),
                  p_condition: value(f, "condition"),
                  p_cost: Number(value(f, "cost")),
                }),
              "Maintenance resolved",
            );
          }}
        >
          <Field label="Resolution / work completed">
            <textarea name="resolution" required maxLength={2000} />
          </Field>
          <Field label="Confirmed equipment condition">
            <select name="condition">
              {CONDITIONS.filter((c) => c !== "Needs Repair").map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Actual repair cost (PHP)">
            <input
              name="cost"
              type="number"
              required
              min="0"
              step="0.01"
              defaultValue={resolve.cost}
            />
          </Field>
          <p className="form-note">
            Equipment becomes usable after all its open maintenance records are
            resolved.
          </p>
        </Dialog>
      )}
    </>
  );
}
export function Notifications() {
  const { data, perform, navigate } = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const list = [...data.notifications].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  async function read(id: string | null) {
    setBusy(true);
    setError("");
    try {
      await perform(() => rpc("read_notifications", { p_id: id }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title="Notifications"
        description="Request updates and equipment handover messages."
      >
        <button
          className="button secondary"
          disabled={busy || !list.some((n) => !n.read_at)}
          onClick={() => void read(null)}
        >
          Mark all read
        </button>
      </Heading>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="card">
        {list.length ? (
          <div className="notification-list">
            {list.map((n) => (
              <article key={n.id} className={n.read_at ? "" : "unread"}>
                <span className="notification-icon">
                  <Bell size={19} />
                </span>
                <div>
                  <p>{n.message}</p>
                  <small>{formatDate(n.created_at, true)} PHT</small>
                  <div className="actions">
                    {n.request_id && (
                      <button
                        className="text-button small"
                        onClick={() => navigate(`borrowing/${n.request_id}`)}
                      >
                        View request
                      </button>
                    )}
                    {!n.read_at && (
                      <button
                        className="text-button small"
                        disabled={busy}
                        onClick={() => void read(n.id)}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
                {!n.read_at && (
                  <span className="unread-dot" aria-label="Unread" />
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty title="You're all caught up">
            Updates will appear when requests and transactions are processed.
          </Empty>
        )}
      </section>
    </>
  );
}
export function Reports() {
  const { data } = useApp();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const eq = (id: string) => data.equipment.find((e) => e.id === id);
  const person = (id: string) =>
    data.profiles.find((p) => p.id === id)?.full_name || "";
  const included = (date: string) => inSchoolDateRange(date, start, end);
  function download(type: string) {
    setError("");
    if (start && end && start > end) {
      setError("The start date must be before the end date.");
      return;
    }
    let rows: unknown[][] = [];
    if (type === "inventory")
      rows = [
        ["Asset", "Name", "Category", "Location", "Condition", "Status"],
        ...data.equipment
          .filter((e) => included(e.created_at))
          .map((e) => [
            e.asset_number,
            e.name,
            e.category,
            e.location,
            e.condition,
            e.availability,
          ]),
      ];
    if (type === "borrowing")
      rows = [
        [
          "Request",
          "Borrower",
          "Asset",
          "Equipment",
          "Purpose",
          "Borrow date",
          "Due date",
          "Status",
        ],
        ...data.requests
          .filter((r) => included(r.created_at))
          .map((r) => [
            `REQ-${r.reference}`,
            person(r.borrower_id),
            eq(r.equipment_id)?.asset_number,
            eq(r.equipment_id)?.name,
            r.purpose,
            r.requested_date,
            r.due_date,
            r.status,
          ]),
      ];
    if (type === "maintenance")
      rows = [
        [
          "Asset",
          "Incident",
          "Reported (PHT)",
          "Status",
          "Cost PHP",
          "Resolution",
        ],
        ...data.maintenance
          .filter((m) => included(m.created_at))
          .map((m) => [
            eq(m.equipment_id)?.asset_number,
            m.incident,
            formatDate(m.created_at, true),
            m.status,
            m.cost,
            m.resolution,
          ]),
      ];
    if (type === "overdue")
      rows = [
        ["Asset", "Equipment", "Borrower", "Due date", "Released (PHT)"],
        ...data.loans
          .filter(
            (l) =>
              isOverdue(l.due_date, l.returned_at) && included(l.released_at),
          )
          .map((l) => [
            eq(l.equipment_id)?.asset_number,
            eq(l.equipment_id)?.name,
            person(l.borrower_id),
            l.due_date,
            formatDate(l.released_at, true),
          ]),
      ];
    const blob = new Blob([csvContent(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `e-quip-${type}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <Heading
        title="Reports"
        description="Export database records for your presentation and school records."
      />
      <section className="card report-filter">
        <div>
          <h2>Report period</h2>
          <p className="muted">
            Filter by registration, request submission, incident, or release
            date.
          </p>
        </div>
        <Field label="From">
          <input
            aria-label="Report start date"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="Through">
          <input
            aria-label="Report end date"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
        <button
          className="text-button"
          onClick={() => {
            setStart("");
            setEnd("");
          }}
        >
          Clear dates
        </button>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="report-grid">
        {[
          {
            type: "inventory",
            title: "Inventory Report",
            text: "Equipment, location, condition, and availability.",
            icon: Package,
          },
          {
            type: "borrowing",
            title: "Borrowing Report",
            text: "Requests, borrowers, dates, and decisions.",
            icon: ClipboardList,
          },
          {
            type: "maintenance",
            title: "Maintenance Report",
            text: "Incidents, repair costs, and resolutions.",
            icon: Wrench,
          },
          {
            type: "overdue",
            title: "Overdue Report",
            text: "Outstanding loans past their Philippine due date.",
            icon: Clock,
          },
        ].map(({ type, title, text, icon: Icon }) => (
          <section className="card report-card" key={type}>
            <span className="stat-icon">
              <Icon size={25} />
            </span>
            <h2>{title}</h2>
            <p>{text}</p>
            <button className="button secondary" onClick={() => download(type)}>
              <Download size={16} />
              Export CSV
            </button>
          </section>
        ))}
      </div>
      <section className="card audit-card">
        <h2>Recent activity</h2>
        {data.audit.length ? (
          <Table headers={["Action", "Performed by", "Time (PHT)"]}>
            {[...data.audit]
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, 20)
              .map((a) => (
                <tr key={a.id}>
                  <td>{a.action}</td>
                  <td>{person(a.actor_id)}</td>
                  <td>{formatDate(a.created_at, true)}</td>
                </tr>
              ))}
          </Table>
        ) : (
          <Empty title="No activity recorded" />
        )}
      </section>
    </>
  );
}
export function UsersPage() {
  const { data, profile, perform } = useApp();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [reset, setReset] = useState<Profile | null>(null);
  return (
    <>
      <Heading
        title="User Management"
        description="Manage demonstration accounts and access permissions."
      >
        <button className="button" onClick={() => setAdding(true)}>
          <Plus size={17} />
          Add user
        </button>
      </Heading>
      <section className="card">
        <Table headers={["User", "School ID", "Role", "Status", "Actions"]}>
          {data.profiles.map((p) => (
            <tr key={p.id}>
              <td>
                <strong>{p.full_name}</strong>
                <small>{p.email}</small>
              </td>
              <td>{p.school_id || "—"}</td>
              <td>{ROLE_NAMES[p.role]}</td>
              <td>
                <Badge value={p.is_active ? "Active" : "Inactive"} />
              </td>
              <td>
                <div className="actions">
                  <button
                    className="button secondary small"
                    onClick={() => setEditing(p)}
                  >
                    Manage
                  </button>
                  <button
                    className="text-button small"
                    onClick={() => setReset(p)}
                  >
                    Reset password
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </section>
      {adding && (
        <Dialog
          title="Create account"
          onClose={() => setAdding(false)}
          submit="Create account"
          onSubmit={async (f) => {
            await perform(
              () =>
                manageUser({
                  action: "create",
                  email: value(f, "email"),
                  password: value(f, "password"),
                  full_name: value(f, "name"),
                  school_id: value(f, "school"),
                  role: value(f, "role"),
                }),
              "Account created",
            );
          }}
        >
          <div className="form-grid">
            <Field label="Full name">
              <input name="name" required maxLength={120} />
            </Field>
            <Field label="School ID">
              <input name="school" maxLength={80} />
            </Field>
            <Field label="Email" full>
              <input name="email" type="email" required autoComplete="off" />
            </Field>
            <Field label="Role">
              <RoleSelect />
            </Field>
            <Field label="Initial password (12+ characters)">
              <input
                name="password"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <p className="form-note">
            Give the account details directly to the intended demonstration
            user.
          </p>
        </Dialog>
      )}
      {editing && (
        <Dialog
          title={`Manage ${editing.full_name}`}
          onClose={() => setEditing(null)}
          submit="Save account"
          onSubmit={async (f) => {
            await perform(
              () =>
                rpc("manage_profile", {
                  p_id: editing.id,
                  p_role: value(f, "role"),
                  p_active: value(f, "active") === "true",
                }),
              "Account updated",
            );
          }}
        >
          <Field label="Role">
            <RoleSelect defaultValue={editing.role} />
          </Field>
          <Field label="Account status">
            <select name="active" defaultValue={String(editing.is_active)}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Field>
          <p className="form-note">
            Deactivation blocks access while preserving borrowing history. The
            final active administrator is protected.
            {editing.id === profile.id
              ? " Changes to your own access take effect immediately."
              : ""}
          </p>
        </Dialog>
      )}
      {reset && (
        <Dialog
          title={`Reset password for ${reset.full_name}`}
          onClose={() => setReset(null)}
          submit="Set new password"
          onSubmit={async (f) => {
            await perform(
              () =>
                manageUser({
                  action: "reset",
                  user_id: reset.id,
                  password: value(f, "password"),
                }),
              "Password reset",
            );
          }}
        >
          <Field label="New password (12+ characters)">
            <input
              name="password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
            />
          </Field>
          <p className="form-note">The existing password is never displayed.</p>
        </Dialog>
      )}
    </>
  );
}
function RoleSelect({ defaultValue = "borrower" }: { defaultValue?: Role }) {
  return (
    <select name="role" defaultValue={defaultValue}>
      {Object.entries(ROLE_NAMES).map(([role, name]) => (
        <option key={role} value={role}>
          {name}
        </option>
      ))}
    </select>
  );
}
export function Settings() {
  return (
    <>
      <Heading
        title="System Settings"
        description="Configuration for the E-QUIP school demonstration."
      />
      <section className="card form-card">
        <h2>
          <ShieldCheck size={20} /> E-QUIP
        </h2>
        <div className="record-grid">
          {[
            ["School timezone", "Asia/Manila · Philippine Time (UTC+8)"],
            ["Borrowing policy", "One physical asset per request"],
            ["Reservation policy", "Approval reserves the asset immediately"],
            ["Overdue policy", "After the due date ends in Philippine Time"],
            ["Notifications", "In-app updates"],
            ["Database", "Supabase PostgreSQL"],
          ].map(([k, v]) => (
            <div key={k}>
              <span className="muted">{k}</span>
              <p>{v}</p>
            </div>
          ))}
        </div>
        <p className="form-note">
          These are the agreed demonstration policies. Account permissions are
          managed under User Management.
        </p>
        <a
          className="button secondary"
          href="/downloads/E-QUIP-source.zip"
          download
        >
          <Download size={16} />
          Download project source
        </a>
      </section>
    </>
  );
}
