import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { X, Package, LoaderCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${value.toLowerCase().replaceAll(" ", "-")}`}>
      {value}
    </span>
  );
}
export function Empty({
  title = "No records yet",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Package size={30} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
export function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`field ${full ? "full" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Dialog({
  title,
  onClose,
  children,
  onSubmit,
  submit = "Save",
  busyLabel = "Saving…",
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  onSubmit?: (data: FormData) => Promise<void>;
  submit?: string;
  busyLabel?: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => el.close();
  }, []);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !onSubmit) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(new FormData(e.currentTarget));
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className={wide ? "wide" : ""}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <div className="dialog-header">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <form onSubmit={send}>
        <fieldset disabled={busy}>{children}</fieldset>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            {onSubmit ? "Cancel" : "Close"}
          </button>
          {onSubmit && (
            <button className="button" disabled={busy}>
              {busy && <LoaderCircle size={16} className="spin" />}
              {busy ? busyLabel : submit}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
export function EquipmentPhoto({
  path,
  name,
  large = false,
}: {
  path: string | null;
  name: string;
  large?: boolean;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    setUrl("");
    if (path)
      void supabase.storage
        .from("equipment-photos")
        .createSignedUrl(path, 3600)
        .then(({ data }) => {
          if (active && data) setUrl(data.signedUrl);
        });
    return () => {
      active = false;
    };
  }, [path]);
  return url ? (
    <img
      src={url}
      alt={name}
      className={large ? "record-photo" : "equipment-photo"}
    />
  ) : (
    <div
      className={
        large
          ? "record-photo photo-placeholder"
          : "equipment-photo photo-placeholder"
      }
    >
      <Package size={large ? 48 : 22} />
    </div>
  );
}
export const value = (f: FormData, key: string) =>
  String(f.get(key) || "").trim();
