import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useGetExecutiveSummaryDataByIdQuery } from "../../services/leadApi";
import type { ExecutiveDashboardData, LeadStatus } from "../../services/leadApi";

/* ---------- Types ---------- */

export interface DashboardStats {
  assignedLeads: number;
  leadsContacted: number;
  totalCalls: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  convertedLeads: number;
}

type FollowUpItem = ExecutiveDashboardData["followUps"]["today"]["items"][number];
type Tone = "blue" | "green" | "amber" | "red" | "slate";

interface StatCardConfig {
  key: keyof DashboardStats;
  label: string;
  href: string;
  tone: Tone;
  icon: ReactNode;
}

/* ---------- Card config ---------- */

const CARDS: StatCardConfig[] = [
  {
    key: "assignedLeads",
    label: "My assigned leads",
    href: "/executive/leads",
    tone: "blue",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.2.7 3.5 2.6 3.5 5.6" />
      </>
    ),
  },
  {
    key: "leadsContacted",
    label: "Leads contacted",
    href: "/executive/leads",
    tone: "slate",
    icon: (
      <>
        <path d="M4 5h16v11H9l-5 4z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),
  },
  {
    key: "totalCalls",
    label: "Total calls",
    href: "/executive/calls",
    tone: "blue",
    icon: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  },
  {
    key: "pendingFollowUps",
    label: "Pending follow-ups",
    href: "/executive/follow-ups",
    tone: "amber",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    key: "overdueFollowUps",
    label: "Overdue follow-ups",
    href: "/executive/follow-ups",
    tone: "red",
    icon: (
      <>
        <path d="M12 3 2.5 20h19z" />
        <path d="M12 10v4M12 17.5v.01" />
      </>
    ),
  },
  {
    key: "convertedLeads",
    label: "Converted leads",
    href: "/executive/leads",
    tone: "green",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12.5 2.8 2.8L16 9.5" />
      </>
    ),
  },
];

const TONES: Record<Tone, { badge: string; value: string }> = {
  blue: { badge: "bg-blue-50 text-blue-700", value: "text-slate-900" },
  slate: { badge: "bg-slate-100 text-slate-700", value: "text-slate-900" },
  green: { badge: "bg-emerald-50 text-emerald-700", value: "text-slate-900" },
  amber: { badge: "bg-amber-50 text-amber-700", value: "text-slate-900" },
  red: { badge: "bg-red-50 text-red-700", value: "text-red-700" },
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-slate-100 text-slate-700",
  INTERESTED: "bg-amber-50 text-amber-700",
  FOLLOW_UP: "bg-indigo-50 text-indigo-700",
  VISIT_SCHEDULED: "bg-sky-50 text-sky-700",
  CONVERTED: "bg-emerald-50 text-emerald-700",
  NOT_INTERESTED: "bg-red-50 text-red-700",
};

/* ---------- Helpers ---------- */

const nf = new Intl.NumberFormat("en-IN");

/** 75 -> "75%", 66.7 -> "66.7%" */
const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

const humanize = (value: string) => {
  const text = value.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const budget = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function overdueBy(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min overdue`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr overdue`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} overdue`;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function readUser(): { id?: number | string; name?: string; email?: string } {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function getErrorMessage(err: unknown): string {
  const e = err as { data?: { message?: string }; error?: string } | undefined;
  return e?.data?.message ?? e?.error ?? "Failed to load dashboard data. Please try again.";
}

/* ---------- Small components ---------- */

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {action}
    </div>
  );
}

const linkClass =
  "rounded text-sm font-medium text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300";

function PerformanceCard({
  label,
  value,
  note,
  formula,
  loading,
}: {
  label: string;
  value: number;
  note: string;
  formula: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-9 w-20 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{pct(value)}</p>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={loading ? undefined : value}
        className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100"
      >
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${loading ? 0 : Math.min(value, 100)}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-700">{loading ? "\u00A0" : note}</p>
      <p className="mt-0.5 text-xs text-slate-500">{formula}</p>
    </div>
  );
}

function FollowUpList({
  title,
  total,
  items,
  emptyText,
  alert,
  loading,
  when,
}: {
  title: string;
  total: number;
  items: FollowUpItem[];
  emptyText: string;
  alert?: boolean;
  loading: boolean;
  when: (item: FollowUpItem) => ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={`flex flex-col rounded-xl border bg-white ${alert && total > 0 ? "border-red-200" : "border-blue-100"}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-blue-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {!loading && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                alert && total > 0 ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
              }`}
            >
              {total}
            </span>
          )}
        </div>
        <Link to="/executive/follow-ups" className={linkClass}>
          View all
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-blue-50">
          {items.map((f) => (
            <li key={f.id}>
              <Link
                to={`/executive/leads/${f.lead.id}`}
                className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-blue-50/50 focus:outline-none focus-visible:bg-blue-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">{f.lead.customerName}</span>
                  <span className="block truncate text-sm text-slate-500">{f.notes || "No notes"}</span>
                </span>
                <span className="shrink-0 text-right text-sm">{when(f)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && total > items.length && (
        <p className="border-t border-blue-100 px-5 py-3 text-sm text-slate-500">
          Showing {items.length} of {total}.{" "}
          <Link to="/executive/follow-ups" className={linkClass}>
            See the rest
          </Link>
        </p>
      )}
    </section>
  );
}

/* ---------- Page ---------- */

export default function ExecutiveDashboard() {
  const user = readUser();
  const executiveId = Number(user.id);
  const validId = Number.isInteger(executiveId) && executiveId > 0;

  const { data, isLoading, isError, error, refetch } = useGetExecutiveSummaryDataByIdQuery(executiveId, {
    skip: !validId,
    // Always show fresh numbers after the executive logs a call or updates a lead
    refetchOnMountOrArgChange: true,
  });

  const name = data?.executiveInfo.name ?? user.name ?? "there";
  const email = data?.executiveInfo.email ?? user.email ?? "";
  const firstName = name.split(" ")[0];
  const loading = isLoading && validId;
  const stats = data?.summary;
  const perf = data?.performance;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      {/* Header: name, date and profile */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{today}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Here is where your leads and follow-ups stand today.</p>
        </div>

        <Link
          to="/executive/profile"
          aria-label="Open your profile"
          className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white px-3 py-2 transition-colors hover:bg-blue-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-slate-900">{name}</span>
            <span className="block truncate text-sm text-slate-500">{email || "Sales Executive"}</span>
          </span>
        </Link>
      </header>

      {!validId && (
        <p role="alert" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          We could not find your login details.{" "}
          <Link to="/login" className="font-medium underline">
            Log in again
          </Link>
        </p>
      )}

      {isError && (
        <div
          role="alert"
          className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{getErrorMessage(error)}</span>
          <button type="button" onClick={refetch} className="font-medium underline">
            Try again
          </button>
        </div>
      )}

      {/* Statistics cards */}
      <section aria-label="Statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((card) => {
          const tone = TONES[card.tone];
          const alert = card.key === "overdueFollowUps" && (stats?.overdueFollowUps ?? 0) > 0;
          return (
            <Link
              key={card.key}
              to={card.href}
              className={`flex items-center gap-4 rounded-xl border bg-white p-5 transition-colors hover:bg-blue-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                alert ? "border-red-200" : "border-blue-100"
              }`}
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tone.badge}`}>
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {card.icon}
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-500">{card.label}</span>
                {loading ? (
                  <span className="mt-1 block h-8 w-14 animate-pulse rounded bg-slate-100" />
                ) : (
                  <span className={`block text-3xl font-semibold tabular-nums ${tone.value}`}>
                    {nf.format(stats?.[card.key] ?? 0)}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </section>

      {/* My sales performance */}
      <section aria-label="My sales performance" className="mt-8">
        <SectionHeader title="My sales performance" />
        <div className="grid gap-4 md:grid-cols-3">
          <PerformanceCard
            label="Call coverage rate"
            value={perf?.callCoverageRate ?? 0}
            note={`${nf.format(stats?.leadsContacted ?? 0)} of ${nf.format(stats?.assignedLeads ?? 0)} assigned leads contacted`}
            formula="Unique leads contacted ÷ assigned leads"
            loading={loading}
          />
          <PerformanceCard
            label="Conversion rate"
            value={perf?.conversionRate ?? 0}
            note={`${nf.format(stats?.convertedLeads ?? 0)} of ${nf.format(stats?.assignedLeads ?? 0)} assigned leads converted`}
            formula="Converted leads ÷ assigned leads"
            loading={loading}
          />
          <PerformanceCard
            label="Connection rate"
            value={perf?.connectionRate ?? 0}
            note={`${nf.format(perf?.connectedCalls ?? 0)} of ${nf.format(stats?.totalCalls ?? 0)} calls connected`}
            formula="Connected calls ÷ total calls"
            loading={loading}
          />
        </div>
        <p className="mt-2 text-sm text-slate-500">Based on all your leads and calls so far.</p>
      </section>

      {/* Today's and overdue follow-ups */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <FollowUpList
          title="Today's follow-ups"
          total={data?.followUps.today.total ?? 0}
          items={data?.followUps.today.items ?? []}
          emptyText="Nothing else is due today."
          loading={loading}
          when={(f) => <span className="font-medium text-slate-800">{time(f.scheduledAt)}</span>}
        />
        <FollowUpList
          title="Overdue follow-ups"
          total={data?.followUps.overdue.total ?? 0}
          items={data?.followUps.overdue.items ?? []}
          emptyText="No overdue follow-ups. Nice work."
          alert
          loading={loading}
          when={(f) => (
            <>
              <span className="block font-medium text-red-600">{overdueBy(f.scheduledAt)}</span>
              <span className="block text-slate-500">
                {shortDate(f.scheduledAt)}, {time(f.scheduledAt)}
              </span>
            </>
          )}
        />
      </div>

      {/* Recently assigned leads */}
      <section aria-label="Recently assigned leads" className="mt-8">
        <SectionHeader
          title="Recently assigned leads"
          action={
            <Link to="/executive/leads" className={linkClass}>
              View all leads
            </Link>
          }
        />
        <div className="overflow-hidden rounded-xl border border-blue-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-blue-50 text-blue-900">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Property</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Budget</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Calls</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {loading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-5 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))}

                {!loading && (data?.recentLeads.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No leads have been assigned to you yet.
                    </td>
                  </tr>
                )}

                {data?.recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-blue-50/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{lead.customerName}</p>
                      <a href={`tel:${lead.mobile}`} className="text-slate-500 hover:text-blue-700 hover:underline">
                        {lead.mobile}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{lead.propertyCategory}</p>
                      <p className="text-slate-500">{lead.preferredLocation}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-800">
                      {budget(lead.budget)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[lead.status] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {humanize(lead.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.callCount === 0 ? (
                        <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          Not called yet
                        </span>
                      ) : (
                        <span className="tabular-nums text-slate-700">{lead.callCount}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/executive/leads/${lead.id}`}
                        className="rounded-lg px-3 py-1.5 font-medium text-blue-700 transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}