import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Camera, Download, Printer, Search, Square } from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";
import { useApp } from "../lib/context";
import { Empty, Field, Heading } from "../components/ui";
export function QRPage({ equipmentId }: { equipmentId?: string }) {
  const { data, navigate } = useApp();
  const [selected, setSelected] = useState(
    equipmentId ||
      data.equipment.find((e) => e.availability !== "Archived")?.id ||
      "",
  );
  const [image, setImage] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scanner = useRef<Html5Qrcode | null>(null);
  const alive = useRef(true);
  const item = data.equipment.find((e) => e.id === selected);
  const url = item ? `${window.location.origin}/#/equipment/${item.id}` : "";
  useEffect(() => {
    let current = true;
    setImage("");
    if (url)
      void QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: "M",
      })
        .then((v) => {
          if (current) setImage(v);
        })
        .catch(() => {
          if (current) setError("Could not generate this QR label.");
        });
    return () => {
      current = false;
    };
  }, [url]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const s = scanner.current;
      if (s?.isScanning) void s.stop().catch(() => {});
    };
  }, []);
  function openResult(raw: string) {
    let found;
    const trimmed = raw.trim();
    try {
      const parsed = new URL(trimmed);
      if (parsed.origin !== location.origin)
        throw new Error("Unexpected website");
      const id = parsed.hash.match(/^#\/equipment\/([a-f0-9-]+)$/i)?.[1];
      found = data.equipment.find((e) => e.id === id);
    } catch {
      found = data.equipment.find(
        (e) => e.asset_number.toLowerCase() === trimmed.toLowerCase(),
      );
    }
    if (!found) {
      setError("No matching E-QUIP equipment record was found.");
      return;
    }
    const s = scanner.current;
    if (s?.isScanning) void s.stop().catch(() => {});
    navigate(`equipment/${found.id}`);
  }
  async function start() {
    if (busy || scanning) return;
    setBusy(true);
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!alive.current) return;
      const s = new Html5Qrcode("camera-scanner");
      scanner.current = s;
      await s.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.floor(Math.min(width, height, 320) * 0.7);
            return { width: size, height: size };
          },
        },
        (text) => openResult(text),
        () => {},
      );
      if (!alive.current) {
        await s.stop();
        return;
      }
      setScanning(true);
    } catch (error) {
      if (alive.current) {
        const details =
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error);
        if (
          /NotAllowedError|PermissionDeniedError|permission denied/i.test(
            details,
          )
        )
          setError(
            "Camera permission was denied. Allow camera access for this site and try again. If you are viewing the embedded page, open E-QUIP in a new browser tab.",
          );
        else if (/NotFoundError|DevicesNotFoundError/i.test(details))
          setError(
            "No camera was found. Connect a camera or scan a saved QR image.",
          );
        else if (
          /NotReadableError|TrackStartError|Could not start video source/i.test(
            details,
          )
        )
          setError(
            "The camera is unavailable or in use by another app. Close other camera apps and try again.",
          );
        else if (/not supported|secure context|https/i.test(details))
          setError(
            "Camera access is unavailable here. Open E-QUIP in a browser tab over HTTPS.",
          );
        else
          setError(
            "Camera could not start. Check camera access and try again, or scan a saved QR image.",
          );
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function stop() {
    setBusy(true);
    try {
      if (scanner.current?.isScanning) await scanner.current.stop();
      setScanning(false);
    } catch {
      setError("Could not stop the camera. Leave this page to close it.");
    } finally {
      setBusy(false);
    }
  }
  async function scanFile(file: File | undefined) {
    if (!file || busy) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a QR image under 10 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const s = new Html5Qrcode("file-scanner");
      const result = await s.scanFile(file, false);
      s.clear();
      openResult(result);
    } catch {
      setError("No readable equipment QR code was found in that image.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title="QR Code Management"
        description="A quick connection between physical equipment and its record."
      />
      <div className="qr-layout">
        <section className="card">
          <h2>Generate equipment label</h2>
          <p className="muted">
            Select an asset to create its permanent record link.
          </p>
          <Field label="Equipment">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {data.equipment
                .filter((e) => e.availability !== "Archived")
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.asset_number} — {e.name}
                  </option>
                ))}
            </select>
          </Field>
          {item && image ? (
            <>
              <div className="qr-label">
                <strong>E-QUIP</strong>
                <img
                  src={image}
                  alt={`Equipment QR code for ${item.asset_number}`}
                />
                <h3>{item.asset_number}</h3>
                <p>{item.name}</p>
                <small>Scan to view equipment record</small>
              </div>
              <div className="actions center">
                <a
                  className="button secondary"
                  href={image}
                  download={`${item.asset_number}-qr.png`}
                >
                  <Download size={16} />
                  Save QR
                </a>
                <button className="button" onClick={() => window.print()}>
                  <Printer size={16} />
                  Print label
                </button>
              </div>
            </>
          ) : (
            <Empty title="Select equipment to generate a label" />
          )}
        </section>
        <section className="card">
          <h2>Scan an equipment QR</h2>
          <p className="muted">
            Open a record using your camera, a saved QR image, or an asset
            number.
          </p>
          <div className="scanner-stage">
            <div id="camera-scanner" className="scanner" />
            {!scanning && (
              <div className="scanner-placeholder">
                <Camera size={42} />
                <p>
                  {busy
                    ? "Please wait…"
                    : "Point your camera at an E-QUIP label"}
                </p>
              </div>
            )}
          </div>
          <div className="actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => void (scanning ? stop() : start())}
            >
              {scanning ? <Square size={16} /> : <Camera size={16} />}{" "}
              {busy
                ? "Please wait…"
                : scanning
                  ? "Stop camera"
                  : "Start camera"}
            </button>
          </div>
          <Field label="Scan a saved QR image">
            <input
              type="file"
              accept="image/*"
              disabled={busy || scanning}
              onChange={(e) => void scanFile(e.target.files?.[0])}
            />
          </Field>
          <div id="file-scanner" />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              openResult(query);
            }}
          >
            <Field label="Or enter an asset number">
              <div className="lookup">
                <input
                  required
                  placeholder="EQ-001"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button className="button" aria-label="Look up asset">
                  <Search size={18} />
                </button>
              </div>
            </Field>
          </form>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
