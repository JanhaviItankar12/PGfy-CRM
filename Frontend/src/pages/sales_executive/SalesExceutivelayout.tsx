import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Outlet, useNavigate } from "react-router-dom";

/* ---------- Types ---------- */

export type SalesNavKey =
  | "dashboard"
  | "myLeads"
  | "followups"
  | "calls"
  | "profile";

export interface SalesNavItem {
  key: SalesNavKey;
  label: string;
  href: string;
}

/* ---------- Menu config: edit labels and routes here ---------- */

const MAIN_MENU: SalesNavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/executive/dashboard" },
  { key: "myLeads", label: "My Leads", href: "/executive/leads" },
  { key: "followups", label: "Follow-ups", href: "/executive/follow-ups" },
  { key: "calls", label: "Call History", href: "/executive/calls" },
];

const SETTINGS_MENU: SalesNavItem[] = [
  { key: "profile", label: "Profile", href: "/executive/profile" },
];

/* ---------- Icons ---------- */

const ICONS: Record<SalesNavKey | "logout", ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  myLeads: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.2.7 3.5 2.6 3.5 5.6" />
    </>
  ),
  followups: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  calls: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  ),
  profile: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  logout: <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9" />,
};

function Icon({ name }: { name: SalesNavKey | "logout" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

/* ---------- Sidebar ---------- */

interface SalesSidebarProps {
  active: SalesNavKey;
  /** Use with React Router etc. If omitted, links navigate normally with href. */
  onNavigate?: (item: SalesNavItem) => void;
  onLogout?: () => void;
  userName?: string;
  userRole?: string;
  /** Mobile drawer control */
  open?: boolean;
  onClose?: () => void;
}

export function SalesSidebar({
  active,
  onNavigate,
  onLogout,
  userName = "Sales Executive",
  userRole = "Sales Executive",
  open = false,
  onClose,
}: SalesSidebarProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const renderItem = (item: SalesNavItem) => {
    const isActive = item.key === active;
    return (
      <li key={item.key}>
        <a
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate(item);
            }
            onClose?.();
          }}
          className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
            isActive
              ? "bg-blue-50 text-blue-700"
              : "text-slate-600 hover:bg-blue-50/60 hover:text-blue-700"
          }`}
        >
          {isActive && (
            <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-blue-600" aria-hidden="true" />
          )}
          <Icon name={item.key} />
          {item.label}
        </a>
      </li>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-blue-100 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-lg font-bold text-white">
            P
          </span>
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight text-slate-900">PGfy</p>
            <p className="text-sm text-slate-500">Sales CRM</p>
          </div>
        </div>

        {/* Menus */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-3 pb-2 pt-3 text-sm font-medium text-slate-500">Main menu</p>
          <ul className="space-y-1">{MAIN_MENU.map(renderItem)}</ul>

          <p className="px-3 pb-2 pt-6 text-sm font-medium text-slate-500">Settings</p>
          <ul className="space-y-1">{SETTINGS_MENU.map(renderItem)}</ul>
        </nav>

        {/* User and logout */}
        <div className="border-t border-blue-100 p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800">
              {userName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
              <p className="truncate text-sm text-slate-500">{userRole}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <Icon name="logout" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

/* ---------- Layout ---------- */

export default function SalesLayout({
  active = "dashboard",
  userName = "Sales Executive",
  userRole = "Sales Executive",
  onLogout,
  onNavigate,
}: Partial<Omit<SalesSidebarProps, "open" | "onClose">>) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (onLogout) {
      onLogout();
    } else {
      navigate("/login");
    }
  };

  const handleNavigate = (item: SalesNavItem) => {
    if (onNavigate) {
      onNavigate(item);
    } else {
      navigate(item.href);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <SalesSidebar
        active={active}
        userName={userName}
        userRole={userRole}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        open={open}
        onClose={() => setOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-blue-100 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid h-9 w-9 place-items-center rounded-lg"
          >
            ☰
          </button>
          <span className="text-lg font-semibold">PGfy</span>
        </div>

        {/* Nested route content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}