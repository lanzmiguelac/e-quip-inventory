import { AccessRequestPage } from "./features/auth/AccessRequestPage";
import { Login } from "./features/auth/Login";
import {
  oauthErrorMessage,
  restoreOAuthRoute,
} from "./features/auth/googleAuth";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Package,
  QrCode,
  ClipboardList,
  ArrowLeftRight,
  Wrench,
  FileText,
  Bell,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  RefreshCw,
  GraduationCap,
  ChevronRight,
} from "lucide-react";
import { supabase, loadData } from "./lib/supabase";
import { AppContext } from "./lib/context";
import { ROLE_NAMES, type Data, type Profile } from "./lib/types";
import { formatDate } from "./lib/rules";
import { Dashboard } from "./features/Dashboard";
import { Inventory, EquipmentDetails } from "./features/Inventory";
import { Borrowing, Transactions } from "./features/Borrowing";
const MaintenancePage = lazy(() =>
  import("./features/Operations").then((module) => ({
    default: module.MaintenancePage,
  })),
);
const Notifications = lazy(() =>
  import("./features/Operations").then((module) => ({
    default: module.Notifications,
  })),
);
const Reports = lazy(() =>
  import("./features/Operations").then((module) => ({
    default: module.Reports,
  })),
);
const Settings = lazy(() =>
  import("./features/Operations").then((module) => ({
    default: module.Settings,
  })),
);
const UsersPage = lazy(() =>
  import("./features/Operations").then((module) => ({
    default: module.UsersPage,
  })),
);
const QRPage = lazy(() =>
  import("./features/QR").then((module) => ({ default: module.QRPage })),
);
const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "inventory", label: "Equipment Inventory", icon: Package },
  { id: "qr", label: "QR Management", icon: QrCode },
  { id: "borrowing", label: "Borrowing Requests", icon: ClipboardList },
  {
    id: "transactions",
    label: "Transactions",
    icon: ArrowLeftRight,
    staff: true,
  },
  {
    id: "maintenance",
    label: "Damage & Maintenance",
    icon: Wrench,
    staff: true,
  },
  { id: "reports", label: "Reports", icon: FileText, staff: true },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "users", label: "User Management", icon: Users, admin: true },
  { id: "settings", label: "Settings", icon: SettingsIcon, admin: true },
];
const empty: Data = {
  equipment: [],
  requests: [],
  loans: [],
  maintenance: [],
  notifications: [],
  profiles: [],
  audit: [],
};
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unapproved, setUnapproved] = useState(false);
  const [data, setData] = useState<Data>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => oauthErrorMessage(location.href));
  const [path, setPath] = useState(
    location.hash.replace(/^#\/?/, "") || "dashboard",
  );
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [synced, setSynced] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (alive) {
        setSession(data.session);
        if (data.session) restoreOAuthRoute();
        setChecking(false);
        if (error) setError(error.message);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setChecking(false);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    const changed = () =>
      setPath(location.hash.replace(/^#\/?/, "") || "dashboard");
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  const sessionUser = useRef(session?.user.id);
  sessionUser.current = session?.user.id;
  const refreshVersion = useRef(0);
  const refresh = useCallback(async () => {
    if (!session) return;
    const userId = session.user.id;
    const version = ++refreshVersion.current;
    const current = () =>
      sessionUser.current === userId && version === refreshVersion.current;
    const { data: p, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error)
      throw new Error(
        "Your account could not be loaded. Check your connection and try again.",
      );
    if (!current()) return;
    if (!p) {
      setUnapproved(true);
      setProfile(null);
      setData(empty);
      setSynced(null);
      setError("");
      return;
    }
    if (!p.is_active) {
      setUnapproved(false);
      setProfile(p as Profile);
      setData(empty);
      throw new Error("This account is inactive. Contact the administrator.");
    }
    const next = await loadData(p as Profile);
    if (!current()) return;
    setUnapproved(false);
    setProfile(p as Profile);
    setData(next);
    setSynced(new Date().toISOString());
    setError("");
  }, [session?.user.id]);
  useEffect(() => {
    if (!session) {
      setUnapproved(false);
      setProfile(null);
      setData(empty);
      setSynced(null);
      return;
    }
    let alive = true;
    setProfile(null);
    setUnapproved(false);
    setData(empty);
    setSynced(null);
    setLoading(true);
    setError("");
    void refresh()
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refresh, session?.user.id]);
  useEffect(() => {
    if (!session) return;
    const update = () => {
      void refresh().catch((e) => setError(e.message));
    };
    window.addEventListener("focus", update);
    const timer = window.setInterval(update, 30000);
    return () => {
      window.removeEventListener("focus", update);
      clearInterval(timer);
    };
  }, [refresh, session?.user.id]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const navigate = (next: string) => {
    location.hash = `/${next}`;
    setMenu(false);
    window.scrollTo(0, 0);
  };
  const perform = async (action: () => Promise<unknown>, message = "") => {
    await action();
    try {
      await refresh();
    } catch (e) {
      setError(
        `Saved, but the latest records could not be loaded: ${(e as Error).message}`,
      );
    }
    if (message) setToast(message);
  };
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
    else navigate("dashboard");
  }
  if (checking)
    return (
      <div className="app-loading">
        <Package size={36} />
        <p>Opening E-QUIP…</p>
      </div>
    );
  if (!session) return <Login initialError={error} />;
  if (unapproved && !loading)
    return (
      <AccessRequestPage
        key={session.user.id}
        email={session.user.email || ""}
        defaultName={String(session.user.user_metadata?.full_name || "")}
        onRefresh={refresh}
        onSignOut={signOut}
      />
    );
  if (!profile || !profile.is_active || (!synced && loading))
    return (
      <div className="app-loading">
        <Package size={36} />
        <h1>E-QUIP</h1>
        {loading ? (
          <p>Loading your school records…</p>
        ) : (
          <>
            <p role="alert" className="error">
              {error || "Account unavailable."}
            </p>
            <div className="actions">
              <button
                className="button secondary"
                onClick={() => void refresh().catch((e) => setError(e.message))}
              >
                Retry
              </button>
              <button className="button" onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    );
  const [section, id, subid] = path.split("/");
  const active = section === "equipment" ? "inventory" : section;
  const allowed = nav.filter(
    (n) =>
      (!n.staff || profile.role !== "borrower") &&
      (!n.admin || profile.role === "admin"),
  );
  const access = allowed.some((n) => n.id === active);
  const unread = data.notifications.filter((n) => !n.read_at).length;
  let content;
  if (!access)
    content = (
      <section className="card">
        <h1>Page unavailable</h1>
        <p>Your role does not have access to this page.</p>
        <button className="button" onClick={() => navigate("dashboard")}>
          Go to dashboard
        </button>
      </section>
    );
  else
    switch (section) {
      case "dashboard":
        content = <Dashboard />;
        break;
      case "inventory":
        content = <Inventory />;
        break;
      case "equipment":
        content = <EquipmentDetails id={id} />;
        break;
      case "borrowing":
        content = (
          <Borrowing
            key={path}
            detailId={id && id !== "new" ? id : undefined}
            openNew={id === "new"}
            newEquipmentId={subid}
          />
        );
        break;
      case "transactions":
        content = <Transactions />;
        break;
      case "maintenance":
        content = <MaintenancePage />;
        break;
      case "qr":
        content = <QRPage key={path} equipmentId={id} />;
        break;
      case "reports":
        content = <Reports />;
        break;
      case "notifications":
        content = <Notifications />;
        break;
      case "users":
        content = <UsersPage />;
        break;
      case "settings":
        content = <Settings />;
        break;
      default:
        content = <Dashboard />;
    }
  return (
    <AppContext.Provider value={{ data, profile, refresh, perform, navigate }}>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a href="#/dashboard" className="brand">
          <span className="brand-icon">
            <Package size={25} />
          </span>
          <span>
            <strong>E-QUIP</strong>
            <small>School Equipment Management</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {allowed.map(({ id: page, label, icon: Icon }) => (
            <a
              key={page}
              href={`#/${page}`}
              aria-current={page === active ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {page === "notifications" && unread > 0 && (
                <b className="nav-count">{unread}</b>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="school-label">
            <GraduationCap size={19} />
            <div>
              <strong>ICCT Colleges</strong>
              <small>Philippine Time · UTC+8</small>
            </div>
          </div>
          <button onClick={() => void signOut()}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={23} />
            </button>
            <span>E-QUIP</span>
            <ChevronRight size={14} />
            <strong>
              {nav.find((n) => n.id === active)?.label || "Dashboard"}
            </strong>
          </div>
          <div className="topbar-right">
            <button
              className="icon-button"
              aria-label="Refresh records"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                void refresh()
                  .catch((e) => setError(e.message))
                  .finally(() => setLoading(false));
              }}
            >
              <RefreshCw size={17} className={loading ? "spin" : ""} />
            </button>
            <button
              className="icon-button bell-button"
              aria-label={`${unread} unread notifications`}
              onClick={() => navigate("notifications")}
            >
              <Bell size={20} />
              {unread > 0 && <i />}
            </button>
            <div className="profile">
              <span className="avatar">
                {profile.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <strong>{profile.full_name}</strong>
                <small>{ROLE_NAMES[profile.role]}</small>
              </div>
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="content">
          {error && (
            <div role="alert" className="error refresh-error">
              {error}
              <button
                className="text-button"
                onClick={() => void refresh().catch((e) => setError(e.message))}
              >
                Retry
              </button>
            </div>
          )}
          <Suspense
            fallback={<section className="card">Loading page…</section>}
          >
            {content}
          </Suspense>
          <footer>
            <span>
              {synced ? `Updated ${formatDate(synced, true)} PHT` : ""}
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </AppContext.Provider>
  );
}
