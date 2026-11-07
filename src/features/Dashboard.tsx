import {
  Package,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  ClipboardList,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { useApp } from "../lib/context";
import { Badge, Empty, Heading, Table } from "../components/ui";
import { formatDate, isOverdue } from "../lib/rules";
export function Dashboard() {
  const { data, profile, navigate } = useApp();
  const staff = profile.role !== "borrower";
  const active = data.equipment.filter((e) => e.availability !== "Archived");
  const pending = data.requests.filter((r) => r.status === "Pending");
  const overdue = data.loans.filter((l) =>
    isOverdue(l.due_date, l.returned_at),
  );
  const open = data.loans.filter((l) => !l.returned_at);
  const counts = staff
    ? [
        {
          label: "Total Equipment",
          number: active.length,
          icon: Package,
          note: "Registered school assets",
          page: "inventory",
        },
        {
          label: "Available",
          number: active.filter((e) => e.availability === "Available").length,
          icon: CheckCircle2,
          note: "Ready for a new request",
          page: "inventory",
        },
        {
          label: "Borrowed",
          number: open.length,
          icon: ArrowUpRight,
          note: "Currently on loan",
          page: "transactions",
        },
        {
          label: "Overdue",
          number: overdue.length,
          icon: Clock,
          note: "Past the return date",
          page: "transactions",
        },
      ]
    : [
        {
          label: "My Requests",
          number: data.requests.length,
          icon: ClipboardList,
          note: "All your borrowing requests",
          page: "borrowing",
        },
        {
          label: "Pending Approval",
          number: pending.length,
          icon: Clock,
          note: "Waiting for staff review",
          page: "borrowing",
        },
        {
          label: "Currently Borrowed",
          number: open.length,
          icon: ArrowUpRight,
          note: "Equipment in your care",
          page: "borrowing",
        },
        {
          label: "Overdue",
          number: overdue.length,
          icon: Clock,
          note: "Please arrange a return",
          page: "borrowing",
        },
      ];
  const recent = [...data.requests]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);
  return (
    <>
      <Heading
        title="Dashboard"
        description="Your school equipment, at a glance."
      />
      <div className="welcome">
        <div>
          <span className="eyebrow">SCHOOL EQUIPMENT MANAGEMENT</span>
          <h2>Welcome back, {profile.full_name.split(" ")[0]}.</h2>
          <p>
            {staff
              ? "Keep every asset accounted for, from request to return."
              : "Find what you need. Borrow responsibly. Return on time."}
          </p>
        </div>
        <div className="welcome-mark" aria-hidden="true">
          <Package size={70} strokeWidth={1} />
        </div>
      </div>
      <div className="stats">
        {counts.map(({ label, number, icon: Icon, note, page }) => (
          <button
            className="card stat"
            key={label}
            onClick={() => navigate(page)}
          >
            <div>
              <span className="muted">{label}</span>
              <strong>{number}</strong>
              <small>{note}</small>
            </div>
            <span
              className={`stat-icon ${label === "Overdue" ? "warning" : ""}`}
            >
              <Icon size={23} />
            </span>
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="card">
          <div className="section-heading">
            <h2>
              {staff ? "Recent Borrowing Requests" : "My Recent Requests"}
            </h2>
            <button
              className="text-button"
              onClick={() => navigate("borrowing")}
            >
              View all <ChevronRight size={16} />
            </button>
          </div>
          {recent.length ? (
            <Table headers={["Equipment", "Borrower", "Requested", "Status"]}>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => navigate(`borrowing/${r.id}`)}
                    >
                      {data.equipment.find((e) => e.id === r.equipment_id)
                        ?.name || "Equipment"}
                    </button>
                    <small>REQ-{r.reference}</small>
                  </td>
                  <td>
                    {data.profiles.find((p) => p.id === r.borrower_id)
                      ?.full_name || profile.full_name}
                  </td>
                  <td>{formatDate(r.created_at)}</td>
                  <td>
                    <Badge value={r.status} />
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty title="No borrowing requests yet">
              Start by browsing available equipment.
            </Empty>
          )}
        </section>
        <section className="card">
          <div className="section-heading">
            <h2>{staff ? "Equipment Status" : "Equipment Available"}</h2>
            <Package size={18} />
          </div>
          {["Available", "Reserved", "Borrowed", "Maintenance"].map((s) => {
            const count = active.filter((e) => e.availability === s).length;
            return (
              <div className="status-line" key={s}>
                <div>
                  <Badge value={s} />
                  <strong>{count}</strong>
                </div>
                <div className="progress">
                  <span
                    className={s.toLowerCase()}
                    style={{
                      width: `${active.length ? (count / active.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
          <button
            className="button secondary full-width"
            onClick={() => navigate("inventory")}
          >
            Browse equipment <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
      {staff && (
        <div className="quick-links">
          <button className="card" onClick={() => navigate("borrowing")}>
            <ClipboardList size={22} />
            <div>
              <strong>{pending.length} requests to review</strong>
              <small>Approve or reject pending requests</small>
            </div>
            <ChevronRight size={18} />
          </button>
          <button className="card" onClick={() => navigate("maintenance")}>
            <Wrench size={22} />
            <div>
              <strong>
                {data.maintenance.filter((m) => m.status !== "Resolved").length}{" "}
                open maintenance records
              </strong>
              <small>Keep repairs moving forward</small>
            </div>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </>
  );
}
