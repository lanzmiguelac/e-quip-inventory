import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Package,
  ShieldCheck,
} from "lucide-react";
import { configured, supabase } from "../../lib/supabase";
import { createGoogleSignInUrl, requireGoogleProvider } from "./googleAuth";
import "./login.css";
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  );
}
export function Login({ initialError }: { initialError: string }) {
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState<"google" | "password" | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const reset = () => setBusy(null);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy("password");
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(f.get("email")).trim(),
        password: String(f.get("password")),
      });
      if (error) throw error;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function google() {
    if (busy) return;
    setBusy("google");
    setError("");
    try {
      await requireGoogleProvider();
      const url = await createGoogleSignInUrl(location.origin, location.hash);
      location.assign(url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }
  return (
    <main className="login-page icct-login">
      <section className="login-intro" aria-label="About E-QUIP">
        <a className="brand" href="#/dashboard">
          <span className="brand-icon">
            <Package size={27} />
          </span>
          <span>
            <strong>E-QUIP</strong>
            <small>ICCT COLLEGES</small>
          </span>
        </a>
        <div className="login-story">
          <h2>
            Equipment borrowing
            <br />
            and inventory
          </h2>
          <div className="school-project">
            <img
              className="school-wordmark"
              src="/branding/icct-logo.png"
              alt="ICCT Colleges"
              width="240"
              height="53"
            />
          </div>
        </div>
        <div className="login-intro-footer">
          <a
            href="https://icct.edu.ph/"
            target="_blank"
            rel="noopener noreferrer"
          >
            ICCT Colleges <ArrowRight size={13} />
          </a>
        </div>
      </section>
      <section className="login-panel" aria-label="Sign in">
        <div className="login-card">
          <div className="login-symbol">
            <GraduationCap size={29} />
          </div>
          <h1>Sign in</h1>
          <p>Use your approved Google account or email.</p>
          <button
            type="button"
            className="google-signin"
            disabled={Boolean(busy) || !configured}
            onClick={() => void google()}
          >
            <GoogleMark />
            {busy === "google"
              ? "Connecting to Google…"
              : "Continue with Google"}
          </button>
          <div className="login-divider">
            <span>or sign in with email</span>
          </div>
          <form onSubmit={submit}>
            <fieldset disabled={Boolean(busy)}>
              <label className="field">
                <span>Email address</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="Enter your email address"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <div className="password-input">
                  <input
                    name="password"
                    type={visible ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            </fieldset>
            <button
              className="button full-width"
              disabled={Boolean(busy) || !configured}
            >
              {busy === "password" ? "Signing in…" : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
          {(!configured || error) && (
            <p className="error" role="alert">
              {!configured
                ? "Sign-in is temporarily unavailable. Contact your administrator."
                : error}
            </p>
          )}
          <div className="approved-access">
            <ShieldCheck size={16} />
            <p>Only administrator-approved accounts can access E-QUIP.</p>
          </div>
          <p className="login-help">
            New Google accounts can request access after signing in.
            <br />
            For password help, contact your administrator.
          </p>
          <div className="login-timezone">
            ICCT Colleges <span>·</span> Philippine Time (UTC+8)
          </div>
        </div>
      </section>
    </main>
  );
}
