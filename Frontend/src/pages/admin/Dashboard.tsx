import { useMemo, useState } from "react";

import type { NavItem } from "./AdminLayout";

/* ---------- Types ---------- */

export interface ExecutiveStats {
  id: string;
  name: string;
  assignedLeads: number;
  totalCalls: number;
  connectedCalls: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  convertedLeads: number;
}

export interface DashboardData {
  totalLeads: number;
  assignedLeads: number;
  unassignedLeads: number;
  totalCalls: number;
  connectedCalls: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  convertedLeads: number;
  executives: ExecutiveStats[];
}

export type DateRange = "today" | "7d" | "30d";

interface AdminDashboardProps {
  /** Pass real data from your API. Falls back to sample data. */
  data?: DashboardData;
  range?: DateRange;
  onRangeChange?: (range: DateRange) => void;
  onAssignLeads?: () => void;
  onNavigate?: (item: NavItem) => void;
  onLogout?: () => void;
}

/* ---------- Sample data (replace with API data) ---------- */

const SAMPLE_DATA: DashboardData = {
  totalLeads: 1240,
  assignedLeads: 1015,
  unassignedLeads: 225,
  totalCalls: 3200,
  connectedCalls: 1865,
  pendingFollowUps: 180,
  overdueFollowUps: 50,
  convertedLeads: 126,
  executives: [
    { id: "1", name: "Priya Deshmukh", assignedLeads: 210, totalCalls: 640, connectedCalls: 410, pendingFollowUps: 38, overdueFollowUps: 6, convertedLeads: 31 },
    { id: "2", name: "Rohan Patil", assignedLeads: 185, totalCalls: 590, connectedCalls: 355, pendingFollowUps: 31, overdueFollowUps: 9, convertedLeads: 24 },
    { id: "3", name: "Sneha Kulkarni", assignedLeads: 172, totalCalls: 560, connectedCalls: 330, pendingFollowUps: 29, overdueFollowUps: 4, convertedLeads: 25 },
    { id: "4", name: "Aman Shaikh", assignedLeads: 160, totalCalls: 510, connectedCalls: 290, pendingFollowUps: 34, overdueFollowUps: 12, convertedLeads: 17 },
    { id: "5", name: "Neha Joshi", assignedLeads: 148, totalCalls: 470, connectedCalls: 265, pendingFollowUps: 22, overdueFollowUps: 5, convertedLeads: 18 },
    { id: "6", name: "Vikram More", assignedLeads: 140, totalCalls: 430, connectedCalls: 215, pendingFollowUps: 26, overdueFollowUps: 14, convertedLeads: 11 },
  ],
};

/* ---------- Helpers ---------- */

const nf = new Intl.NumberFormat("en-IN");
const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

type SortKey =
  | "name"
  | "assignedLeads"
  | "totalCalls"
  | "connectRate"
  | "pendingFollowUps"
  | "overdueFollowUps"
  | "convertedLeads"
  | "conversionRate";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Executive", numeric: false },
  { key: "assignedLeads", label: "Assigned leads", numeric: true },
  { key: "totalCalls", label: "Calls", numeric: true },
  { key: "connectRate", label: "Connect rate", numeric: true },
  { key: "pendingFollowUps", label: "Pending", numeric: true },
  { key: "overdueFollowUps", label: "Overdue", numeric: true },
  { key: "convertedLeads", label: "Converted", numeric: true },
  { key: "conversionRate", label: "Conversion", numeric: true },
];

/* ---------- Small components ---------- */

function StatCard({
  label,
  value,
  note,
  tone = "default",
  action,
}: {
  label: string;
  value: number;
  note?: string;
  tone?: "default" | "primary" | "alert";
  action?: { label: string; onClick?: () => void };
}) {
  const styles = {
    default: "border-blue-100 bg-white text-slate-900",
    primary: "border-blue-600 bg-blue-600 text-white",
    alert: "border-blue-100 bg-white text-slate-900",
  }[tone];
  const labelColor = tone === "primary" ? "text-blue-100" : "text-slate-600";
  const noteColor = tone === "primary" ? "text-blue-100" : "text-slate-500";
  const valueColor = tone === "alert" ? "text-red-600" : "";

  return (
    <div className={`rounded-xl border p-5 ${styles}`}>
      <p className={`text-sm font-medium ${labelColor}`}>{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${valueColor}`}>
        {nf.format(value)}
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        {note && <p className={`text-sm ${noteColor}`}>{note}</p>}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="ml-auto text-sm font-medium text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-semibold text-blue-900">{title}</h2>
      {children}
    </section>
  );
}

/* ---------- Page ---------- */

export default function Dashboard({
  data = SAMPLE_DATA,
  range = "30d",
  onRangeChange,
  onAssignLeads,
  onNavigate,
  onLogout,
}: AdminDashboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>("convertedLeads");
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    const withRates = data.executives.map((e) => ({
      ...e,
      connectRate: pct(e.connectedCalls, e.totalCalls),
      conversionRate: pct(e.convertedLeads, e.assignedLeads),
    }));
    return withRates.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : (av as number) - (bv as number);
      return sortDesc ? -cmp : cmp;
    });
  }, [data.executives, sortKey, sortDesc]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(key !== "name");
    }
  };

  return (
  
      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Leads, calls and follow-ups across your sales team.
            </p>
          </div>
          <div>
            <label htmlFor="range" className="sr-only">
              Date range
            </label>
            <select
              id="range"
              value={range}
              onChange={(e) => onRangeChange?.(e.target.value as DateRange)}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>

        <Section title="Leads">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total leads" value={data.totalLeads} tone="primary" />
            <StatCard
              label="Assigned leads"
              value={data.assignedLeads}
              note={`${pct(data.assignedLeads, data.totalLeads).toFixed(0)}% of all leads`}
            />
            <StatCard
              label="Unassigned leads"
              value={data.unassignedLeads}
              note="Waiting for an executive"
              action={data.unassignedLeads > 0 ? { label: "Assign", onClick: onAssignLeads } : undefined}
            />
            <StatCard
              label="Converted leads"
              value={data.convertedLeads}
              note={`${pct(data.convertedLeads, data.totalLeads).toFixed(1)}% conversion`}
            />
          </div>
        </Section>

        <Section title="Calls and follow-ups">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total calls" value={data.totalCalls} />
            <StatCard
              label="Connected calls"
              value={data.connectedCalls}
              note={`${pct(data.connectedCalls, data.totalCalls).toFixed(0)}% connect rate`}
            />
            <StatCard label="Pending follow-ups" value={data.pendingFollowUps} note="Due today or later" />
            <StatCard
              label="Overdue follow-ups"
              value={data.overdueFollowUps}
              note="Past their due date"
              tone="alert"
            />
          </div>
        </Section>

        <Section title="Performance per executive">
          <div className="overflow-hidden rounded-xl border border-blue-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-blue-50 text-blue-900">
                  <tr>
                    {COLUMNS.map((col) => {
                      const active = sortKey === col.key;
                      return (
                        <th
                          key={col.key}
                          scope="col"
                          aria-sort={active ? (sortDesc ? "descending" : "ascending") : "none"}
                          className={`px-4 py-3 font-semibold ${col.numeric ? "text-right" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSort(col.key)}
                            className="inline-flex items-center gap-1 rounded hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                          >
                            {col.label}
                            <span aria-hidden="true" className={active ? "text-blue-700" : "text-blue-200"}>
                              {active ? (sortDesc ? "▼" : "▲") : "▼"}
                            </span>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50 bg-white">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800">
                            {initials(r.name)}
                          </span>
                          <span className="font-medium text-slate-900">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{nf.format(r.assignedLeads)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{nf.format(r.totalCalls)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.connectRate.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.pendingFollowUps}</td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          r.overdueFollowUps >= 10 ? "font-semibold text-red-600" : ""
                        }`}
                      >
                        {r.overdueFollowUps}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{r.convertedLeads}</td>
                      <td className="px-4 py-3">
                        <div className="ml-auto flex w-32 items-center justify-end gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${Math.min(r.conversionRate * 4, 100)}%` }}
                            />
                          </div>
                          <span className="w-12 text-right tabular-nums">{r.conversionRate.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Connect rate is connected calls divided by total calls. Conversion is converted leads divided by assigned leads.
          </p>
        </Section>
      </main>
    
  );
}


