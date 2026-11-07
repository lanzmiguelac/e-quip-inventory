import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Package, Clock, ShieldCheck } from "lucide-react";
import { rpc } from "../../lib/supabase";
import { Field, value } from "../../components/ui";
import { formatDate } from "../../lib/rules";
import type { AccessRequest, AccessRequestStatus } from "../../lib/types";
export function AccessRequestPage({
  email,
  defaultName = "",
  onRefresh,
  onSignOut,
}: {
  email: string;
  defaultName?: string;
  onRefresh: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [status, setStatus] = useState<AccessRequestStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const load = useCallback(async () => {
    const next = await rpc<AccessRequestStatus>("access_request_status");
    if (!alive.current) return;
    setStatus(next);
    setError("");
    if (next.request?.status === "Approved") await onRefresh();
  }, [onRefresh]);
  useEffect(() => {
    alive.current = true;
    const update = () => {
      void load().catch((e) => {
        if (alive.current) setError((e as Error).message);
      });
    };
    update();
    const interval = setInterval(update, 30000);
    window.addEventListener("focus", update);
    return () => {
      alive.current = false;
      clearInterval(interval);
      window.removeEventListener("focus", update);
    };
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await rpc("submit_access_request", {
        p_full_name: value(data, "name"),
        p_school_id: value(data, "school"),
        p_reason: value(data, "reason"),
      });
      await load();
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function check() {
    if (busy) return;
    setBusy(true);
    try {
      await load();
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const request: AccessRequest | null = status?.request || null;
  return (
    <main className="access-page">
      <section className="card access-card">
        <header className="access-brand">
          <Package size={24} />
          <div>
            <strong>E-QUIP</strong>
            <small>ICCT Colleges</small>
          </div>
        </header>
        <h1>
          {request?.status === "Pending"
            ? "Request pending"
            : request?.status === "Declined"
              ? "Request declined"
              : request?.status === "Approved"
                ? "Access approved"
                : "Request access"}
        </h1>
        <p className="access-email">{email}</p>
        {!status && !error && <p>Checking account access…</p>}
        {status && request ? (
          <>
            <div className="access-status">
              <span>
                {request.status === "Pending" ? (
                  <Clock size={19} />
                ) : (
                  <ShieldCheck size={19} />
                )}
              </span>
              <div>
                <strong>
                  {request.status === "Pending"
                    ? "Waiting for administrator approval"
                    : request.status === "Approved"
                      ? "Your account is approved"
                      : "Your request was declined"}
                </strong>
                <small>
                  Submitted {formatDate(request.requested_at, true)} PHT
                </small>
              </div>
            </div>
            {request.status === "Declined" && (
              <div className="decision-note">
                <strong>Reason</strong>
                <p>{request.decision_note}</p>
                <small>Contact your administrator if you need to appeal.</small>
              </div>
            )}
            <dl className="access-details">
              <div>
                <dt>Name</dt>
                <dd>{request.full_name}</dd>
              </div>
              <div>
                <dt>School ID</dt>
                <dd>{request.school_id}</dd>
              </div>
            </dl>
          </>
        ) : status?.eligible ? (
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              <Field label="Full name">
                <input
                  name="name"
                  defaultValue={defaultName}
                  required
                  maxLength={120}
                  autoComplete="name"
                />
              </Field>
              <Field label="School ID">
                <input name="school" required maxLength={80} />
              </Field>
              <Field label="Message (optional)">
                <textarea name="reason" maxLength={1000} />
              </Field>
            </fieldset>
            <button className="button full-width" disabled={busy}>
              {busy ? "Sending…" : "Request access"}
            </button>
          </form>
        ) : (
          status && <p>Sign in with Google to request access.</p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="access-actions">
          {(request || error) && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void check()}
            >
              {busy
                ? "Checking…"
                : request?.status === "Approved"
                  ? "Continue"
                  : "Check status"}
            </button>
          )}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void onSignOut()}
          >
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}
