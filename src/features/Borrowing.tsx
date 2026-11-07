import { useState } from "react";
import { Plus, Search, ArrowLeft } from "lucide-react";
import {
  Badge,
  Dialog,
  Empty,
  Field,
  Heading,
  Table,
  value,
} from "../components/ui";
import { useApp } from "../lib/context";
import { rpc } from "../lib/supabase";
import { formatDate, isOverdue, schoolDate } from "../lib/rules";
import { CONDITIONS, type BorrowRequest, type Loan } from "../lib/types";
export function RequestForm({
  equipmentId,
  onClose,
}: {
  equipmentId?: string;
  onClose: () => void;
}) {
  const { data, perform } = useApp();
  const available = data.equipment.filter(
    (e) => e.availability === "Available",
  );
  return (
    <Dialog
      title="New borrowing request"
      onClose={onClose}
      submit="Submit request"
      onSubmit={async (f) => {
        await perform(
          () =>
            rpc("submit_request", {
              p_equipment: value(f, "equipment"),
              p_purpose: value(f, "purpose"),
              p_start: value(f, "start"),
              p_due: value(f, "due"),
            }),
          "Request submitted",
        );
      }}
    >
      <p className="form-note">
        Your account identifies you as the borrower. Staff approval reserves
        your selected asset immediately.
      </p>
      <div className="form-grid">
        <Field label="Equipment" full>
          <select name="equipment" defaultValue={equipmentId} required>
            <option value="">Select available equipment</option>
            {available.map((e) => (
              <option key={e.id} value={e.id}>
                {e.asset_number} — {e.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Borrowing date (Philippine Time)">
          <input
            name="start"
            type="date"
            required
            min={schoolDate()}
            defaultValue={schoolDate()}
          />
        </Field>
        <Field label="Due date (Philippine Time)">
          <input
            name="due"
            type="date"
            required
            min={schoolDate()}
            defaultValue={schoolDate()}
          />
        </Field>
        <Field label="Purpose" full>
          <textarea
            name="purpose"
            required
            maxLength={1000}
            placeholder="Describe the class activity or event…"
          />
        </Field>
      </div>
      {!available.length && (
        <p className="error">No equipment is currently available.</p>
      )}
    </Dialog>
  );
}
function RequestActions({
  request,
  onDetails,
}: {
  request: BorrowRequest;
  onDetails?: () => void;
}) {
  const { profile, perform } = useApp();
  const [action, setAction] = useState("");
  const staff = profile.role !== "borrower";
  return (
    <>
      <div className="actions compact">
        {onDetails && (
          <button className="button secondary small" onClick={onDetails}>
            Details
          </button>
        )}
        {request.status === "Pending" && staff && (
          <>
            <button
              className="button green small"
              onClick={() => setAction("Approved")}
            >
              Approve
            </button>
            <button
              className="button danger-outline small"
              onClick={() => setAction("Rejected")}
            >
              Reject
            </button>
          </>
        )}
        {request.status === "Approved" && staff && (
          <button className="button small" onClick={() => setAction("Release")}>
            Release
          </button>
        )}
        {["Pending", "Approved"].includes(request.status) &&
          (staff || request.borrower_id === profile.id) && (
            <button
              className="text-button small"
              onClick={() => setAction("Cancelled")}
            >
              Cancel
            </button>
          )}
      </div>
      {action === "Release" ? (
        <ReleaseForm request={request} onClose={() => setAction("")} />
      ) : (
        action && (
          <Dialog
            title={
              action === "Approved"
                ? "Approve and reserve equipment"
                : action === "Rejected"
                  ? "Reject request"
                  : "Cancel request"
            }
            onClose={() => setAction("")}
            submit={
              action === "Approved"
                ? "Approve & reserve"
                : action === "Rejected"
                  ? "Reject request"
                  : "Cancel request"
            }
            onSubmit={async (f) => {
              await perform(
                () =>
                  rpc("decide_request", {
                    p_id: request.id,
                    p_decision: action,
                    p_reason: value(f, "reason"),
                  }),
                `Request ${action.toLowerCase()}`,
              );
            }}
          >
            <p>
              {action === "Approved"
                ? "This reserves the equipment immediately until it is released or the request is cancelled."
                : action === "Cancelled"
                  ? "This ends the request and frees any approved reservation."
                  : "The borrower will see your reason."}
            </p>
            {action === "Rejected" && (
              <Field label="Rejection reason">
                <textarea name="reason" required maxLength={1000} />
              </Field>
            )}
          </Dialog>
        )
      )}
    </>
  );
}
export function ReleaseForm({
  request,
  onClose,
}: {
  request: BorrowRequest;
  onClose: () => void;
}) {
  const { data, perform } = useApp();
  const item = data.equipment.find((e) => e.id === request.equipment_id);
  return (
    <Dialog
      title="Release equipment"
      onClose={onClose}
      submit="Confirm physical release"
      onSubmit={async (f) => {
        await perform(
          () =>
            rpc("release_equipment", {
              p_request: request.id,
              p_condition: value(f, "condition"),
              p_accessories: value(f, "accessories"),
            }),
          "Equipment released",
        );
      }}
    >
      <p>
        Confirm that you are handing over <strong>{item?.name}</strong> for REQ-
        {request.reference}. Due {formatDate(request.due_date)}.
      </p>
      <Field label="Condition on release">
        <select
          name="condition"
          defaultValue={item?.condition === "Fair" ? "Fair" : "Good"}
        >
          <option>Good</option>
          <option>Fair</option>
        </select>
      </Field>
      <Field label="Accessories handed over">
        <textarea
          name="accessories"
          maxLength={2000}
          defaultValue={item?.remarks}
        />
      </Field>
      <p className="form-note">
        The release time and handling staff are recorded automatically.
      </p>
    </Dialog>
  );
}
export function ReturnForm({
  loan,
  onClose,
}: {
  loan: Loan;
  onClose: () => void;
}) {
  const { data, perform } = useApp();
  const [condition, setCondition] = useState("Good");
  const item = data.equipment.find((e) => e.id === loan.equipment_id);
  return (
    <Dialog
      title="Record equipment return"
      onClose={onClose}
      submit="Confirm return"
      onSubmit={async (f) => {
        await perform(
          () =>
            rpc("return_equipment", {
              p_loan: loan.id,
              p_condition: condition,
              p_accessories: value(f, "accessories"),
              p_incident: value(f, "incident"),
            }),
          "Return recorded",
        );
      }}
    >
      <p>
        Inspect <strong>{item?.name}</strong> and its accessories before
        confirming.
      </p>
      <Field label="Returned condition">
        <select
          name="condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        >
          {CONDITIONS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Returned accessories / missing items">
        <textarea
          name="accessories"
          maxLength={2000}
          defaultValue={loan.release_accessories}
        />
      </Field>
      {condition === "Needs Repair" && (
        <Field label="Describe the damage">
          <textarea name="incident" required maxLength={2000} />
        </Field>
      )}
      <p className="form-note">
        The current Philippine date and receiving staff are recorded
        automatically. A damaged return opens a maintenance record.
      </p>
    </Dialog>
  );
}
export function Borrowing({
  detailId,
  newEquipmentId,
  openNew = false,
}: {
  detailId?: string;
  newEquipmentId?: string;
  openNew?: boolean;
}) {
  const { data, profile, navigate } = useApp();
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const staff = profile.role !== "borrower";
  const item = (id: string) => data.equipment.find((e) => e.id === id);
  const name = (id: string) =>
    data.profiles.find((p) => p.id === id)?.full_name || "Borrower";
  const request = detailId
    ? data.requests.find((r) => r.id === detailId)
    : undefined;
  const rows = data.requests
    .filter(
      (r) =>
        (!status || r.status === status) &&
        [
          String(r.reference),
          item(r.equipment_id)?.name || "",
          name(r.borrower_id),
        ].some((t) => t.toLowerCase().includes(search.toLowerCase())),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (detailId && !request)
    return (
      <Empty title="Request not found">
        This request is unavailable or belongs to another borrower.
      </Empty>
    );
  if (request) {
    const loan = data.loans.find((l) => l.request_id === request.id);
    return (
      <>
        <button
          className="text-button back"
          onClick={() => navigate("borrowing")}
        >
          <ArrowLeft size={16} />
          Borrowing requests
        </button>
        <Heading
          title={`REQ-${request.reference}`}
          description={item(request.equipment_id)?.name || "Equipment record"}
        >
          <RequestActions request={request} />
        </Heading>
        <section className="card form-card">
          <div className="record-grid">
            {[
              ["Borrower", name(request.borrower_id)],
              ["Status", <Badge value={request.status} />],
              ["Borrowing date", formatDate(request.requested_date)],
              ["Due date", formatDate(request.due_date)],
              ["Submitted", formatDate(request.created_at, true)],
              ["Reviewed", formatDate(request.reviewed_at, true)],
            ].map(([l, v]) => (
              <div key={String(l)}>
                <span className="muted">{l}</span>
                <p>{v}</p>
              </div>
            ))}
          </div>
          <h3>Purpose</h3>
          <p className="preserve">{request.purpose}</p>
          {request.rejection_reason && (
            <>
              <h3>Review note</h3>
              <p>{request.rejection_reason}</p>
            </>
          )}
          {loan && (
            <>
              <h3>Handover record</h3>
              <p>
                Released {formatDate(loan.released_at, true)} ·{" "}
                {loan.release_condition}
              </p>
              <p className="preserve">
                Accessories: {loan.release_accessories || "None recorded"}
              </p>
              <p>
                {loan.returned_at
                  ? `Returned ${formatDate(loan.returned_at, true)} · ${loan.return_condition}`
                  : `Due ${formatDate(loan.due_date)}${isOverdue(loan.due_date, loan.returned_at) ? " · Overdue" : ""}`}
              </p>
              {staff && !loan.returned_at && <ReturnAction loan={loan} />}
            </>
          )}
        </section>
      </>
    );
  }
  return (
    <>
      <Heading
        title="Borrowing Requests"
        description={
          staff
            ? "Review requests and manage equipment reservations."
            : "Track your requests, approvals, and borrowing history."
        }
      >
        <button className="button" onClick={() => setAdding(true)}>
          <Plus size={17} />
          New request
        </button>
      </Heading>
      <section className="card">
        <div className="toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              aria-label="Search requests"
              placeholder="Search requests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Request status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {[
              "Pending",
              "Approved",
              "Released",
              "Returned",
              "Rejected",
              "Cancelled",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <span className="muted">{rows.length} requests</span>
        </div>
        {rows.length ? (
          <Table
            headers={[
              "Request",
              "Borrower",
              "Equipment",
              "Schedule",
              "Status",
              "Actions",
            ]}
          >
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">REQ-{r.reference}</td>
                <td>{name(r.borrower_id)}</td>
                <td>
                  <strong>{item(r.equipment_id)?.name || "Equipment"}</strong>
                  <small>{item(r.equipment_id)?.asset_number}</small>
                </td>
                <td>
                  {formatDate(r.requested_date)}
                  <small>Due {formatDate(r.due_date)}</small>
                </td>
                <td>
                  <Badge value={r.status} />
                </td>
                <td>
                  <RequestActions
                    request={r}
                    onDetails={() => navigate(`borrowing/${r.id}`)}
                  />
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty title="No requests found">
            Submit a request for an available asset to get started.
          </Empty>
        )}
      </section>
      {(adding || openNew) && (
        <RequestForm
          equipmentId={newEquipmentId}
          onClose={() => {
            setAdding(false);
            if (openNew) navigate("borrowing");
          }}
        />
      )}
    </>
  );
}
function ReturnAction({ loan }: { loan: Loan }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="button green" onClick={() => setOpen(true)}>
        Record return
      </button>
      {open && <ReturnForm loan={loan} onClose={() => setOpen(false)} />}
    </>
  );
}
export function Transactions() {
  const { data } = useApp();
  const [filter, setFilter] = useState("Open");
  const rows = data.loans
    .filter(
      (l) =>
        filter === "All" ||
        (filter === "Open"
          ? !l.returned_at
          : filter === "Overdue"
            ? isOverdue(l.due_date, l.returned_at)
            : !!l.returned_at),
    )
    .sort((a, b) => b.released_at.localeCompare(a.released_at));
  return (
    <>
      <Heading
        title="Release & Return Transactions"
        description="A record of every physical handover and return."
      />
      <section className="card">
        <div className="toolbar">
          <select
            aria-label="Filter loans"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["Open", "Overdue", "Returned", "All"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <span className="muted">{rows.length} transactions</span>
        </div>
        {rows.length ? (
          <Table
            headers={[
              "Equipment",
              "Borrower",
              "Released / Staff",
              "Due date",
              "Return",
              "Status",
              "Action",
            ]}
          >
            {rows.map((l) => {
              const e = data.equipment.find((e) => e.id === l.equipment_id);
              return (
                <tr key={l.id}>
                  <td>
                    <strong>{e?.name}</strong>
                    <small>{e?.asset_number}</small>
                  </td>
                  <td>
                    {
                      data.profiles.find((p) => p.id === l.borrower_id)
                        ?.full_name
                    }
                  </td>
                  <td>
                    {formatDate(l.released_at, true)}
                    <small>
                      {
                        data.profiles.find((p) => p.id === l.released_by)
                          ?.full_name
                      }
                    </small>
                  </td>
                  <td>{formatDate(l.due_date)}</td>
                  <td>
                    {formatDate(l.returned_at, true)}
                    <small>{l.return_condition || "Awaiting return"}</small>
                  </td>
                  <td>
                    <Badge
                      value={
                        l.returned_at
                          ? "Returned"
                          : isOverdue(l.due_date, l.returned_at)
                            ? "Overdue"
                            : "Released"
                      }
                    />
                  </td>
                  <td>{!l.returned_at && <ReturnAction loan={l} />}</td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <Empty title="No transactions found">
            Release approved requests from the Borrowing Requests page.
          </Empty>
        )}
      </section>
    </>
  );
}
