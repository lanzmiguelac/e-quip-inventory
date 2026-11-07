import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../../lib/context";
import { rpc } from "../../lib/supabase";
import type { AccessRequest } from "../../lib/types";
import { Badge, Dialog, Empty, Field, Table, value } from "../../components/ui";
import { formatDate } from "../../lib/rules";
export function AccessRequests() {
  const { perform } = useApp();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [filter, setFilter] = useState("Pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<{
    request: AccessRequest;
    decision: "Approved" | "Declined";
  } | null>(null);
  const alive = useRef(true);
  const load = useCallback(async () => {
    const rows = await rpc<AccessRequest[]>("list_access_requests");
    if (alive.current) {
      setRequests(rows);
      setError("");
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const update = () => {
      void load().catch((e) => {
        if (alive.current) {
          setError((e as Error).message);
          setLoading(false);
        }
      });
    };
    update();
    const timer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, [load]);
  const visible = requests.filter(
    (r) => filter === "All" || r.status === filter,
  );
  const pending = requests.filter((r) => r.status === "Pending").length;
  return (
    <>
      <section className="card access-requests-card">
        <div className="section-heading">
          <h2>
            Access requests
            <span className="access-count">{pending} pending</span>
          </h2>
          <select
            aria-label="Filter access requests"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["Pending", "Approved", "Declined", "All"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="muted">Loading access requests…</p>
        ) : visible.length ? (
          <Table
            headers={[
              "Name / Google email",
              "School ID",
              "Requested",
              "Status",
              "Actions / Reason",
            ]}
          >
            {visible.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.full_name}</strong>
                  <small>{r.email}</small>
                </td>
                <td>{r.school_id}</td>
                <td>{formatDate(r.requested_at, true)}</td>
                <td>
                  <Badge value={r.status} />
                </td>
                <td>
                  {r.status === "Pending" ? (
                    <div className="actions">
                      <button
                        className="button green small"
                        onClick={() =>
                          setReview({ request: r, decision: "Approved" })
                        }
                      >
                        Approve
                      </button>
                      <button
                        className="button danger-outline small"
                        onClick={() =>
                          setReview({ request: r, decision: "Declined" })
                        }
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span className="wrap-cell">{r.decision_note || "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty
            title={
              filter === "Pending"
                ? "No pending access requests"
                : "No access requests found"
            }
          />
        )}
      </section>
      {review && (
        <Dialog
          title={
            review.decision === "Approved"
              ? "Approve access request"
              : "Decline access request"
          }
          submit={
            review.decision === "Approved"
              ? "Approve as borrower"
              : "Decline request"
          }
          onClose={() => setReview(null)}
          onSubmit={async (data) => {
            await perform(
              () =>
                rpc("review_access_request", {
                  p_id: review.request.id,
                  p_decision: review.decision,
                  p_note: value(data, "note"),
                }),
              review.decision === "Approved"
                ? "Access approved"
                : "Access request declined",
            );
            await load();
          }}
        >
          <dl className="access-details">
            <div>
              <dt>Name</dt>
              <dd>{review.request.full_name}</dd>
            </div>
            <div>
              <dt>Google email</dt>
              <dd>{review.request.email}</dd>
            </div>
            <div>
              <dt>School ID</dt>
              <dd>{review.request.school_id}</dd>
            </div>
          </dl>
          {review.request.reason && (
            <>
              <h3>Request message</h3>
              <p className="preserve">{review.request.reason}</p>
            </>
          )}
          {review.decision === "Approved" ? (
            <p>
              This creates an active borrower account. Staff access can be
              assigned separately under Manage.
            </p>
          ) : (
            <Field label="Reason for declining">
              <textarea name="note" required maxLength={1000} />
            </Field>
          )}
        </Dialog>
      )}
    </>
  );
}
