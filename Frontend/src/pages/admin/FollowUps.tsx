import { useEffect, useMemo, useState } from "react";

/* ---------- Types (match your Prisma schema) ---------- */

/** Same values as the Prisma enum FollowUpStatus */
export type FollowUpStatus = "PENDING" | "COMPLETED" | "CANCELLED";

/**
 * A follow-up from GET /follow-ups, with the lead and executive included.
 * adminApi renames the lead's customerName and mobile to name and phone.
 * Dates arrive as ISO strings once the result goes through JSON.
 */
export interface FollowUp {
  id: number;
  leadId: number;
  executiveId: number;
  callId: number | null;
  scheduledAt: string;
  status: FollowUpStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lead: { id: number; name: string; phone: string };
  executive: { id: number; name: string };
}

interface FollowUpsProps {
  followUps?: FollowUp[];
}

type Category = "overdue" | "today" | "upcoming" | "completed" | "cancelled";
type TabKey = "pending" | "overdue" | "today" | "completed" | "cancelled" | "all";

/* ---------- Helpers ---------- */

const HOUR = 3_600_000;
const PAGE_SIZE = 10;

const CATEGORY_META: Record<Category, { label: string; cls: string }> = {
  overdue: { label: "Overdue", cls: "bg-red-50 text-red-700" },
  today: { label: "Due today", cls: "bg-amber-50 text-amber-700" },
  upcoming: { label: "Upcoming", cls: "bg-blue-50 text-blue-700" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-600" },
};

function categoryOf(f: FollowUp, now: number): Category {
  if (f.status === "COMPLETED") return "completed";
  if (f.status === "CANCELLED") return "cancelled";
  const when = new Date(f.scheduledAt);
  if (when.getTime() < now) return "overdue";
  return when.toDateString() === new Date(now).toDateString() ? "today" : "upcoming";
}

const PENDING_CATEGORIES: Category[] = ["overdue", "today", "upcoming"];

function inTab(cat: Category, tab: TabKey): boolean {
  if (tab === "all") return true;
  if (tab === "pending") return PENDING_CATEGORIES.includes(cat);
  return cat === tab;
}

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

function relative(scheduledAt: string, now: number): string {
  const diff = new Date(scheduledAt).getTime() - now;
  const abs = Math.abs(diff);
  const mins = Math.max(1, Math.round(abs / 60_000));
  const hrs = Math.round(abs / HOUR);
  const days = Math.round(abs / (24 * HOUR));
  const text = mins < 60 ? `${mins} min` : hrs < 24 ? `${hrs} hr` : `${days} day${days > 1 ? "s" : ""}`;
  return diff < 0 ? `${text} overdue` : `in ${text}`;
}

const fieldClass =
  "rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

const TABS: { key: TabKey; label: string }[] = [
  { key: "pending", label: "All pending" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Due today" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

/* ---------- Page ---------- */

export default function FollowUps({ followUps = [] }: FollowUpsProps) {
  const [tab, setTab] = useState<TabKey>("pending");
  const [query, setQuery] = useState("");
  const [executive, setExecutive] = useState("all");
  const [page, setPage] = useState(1);

  // Keep "overdue" accurate while the page stays open
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const executives = useMemo(() => {
    const map = new Map<number, string>();
    followUps.forEach((f) => map.set(f.executive.id, f.executive.name));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [followUps]);

  // Executive and search filters apply first, so the tab counts match what you'd see
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return followUps.filter((f) => {
      if (executive !== "all" && String(f.executiveId) !== executive) return false;
      if (q && !`${f.lead.name} ${f.lead.phone}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [followUps, query, executive]);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { pending: 0, overdue: 0, today: 0, completed: 0, cancelled: 0, all: base.length };
    base.forEach((f) => {
      const cat = categoryOf(f, now);
      if (PENDING_CATEGORIES.includes(cat)) c.pending++;
      if (cat === "overdue") c.overdue++;
      if (cat === "today") c.today++;
      if (cat === "completed") c.completed++;
      if (cat === "cancelled") c.cancelled++;
    });
    return c;
  }, [base, now]);

  const rows = useMemo(() => {
    const list = base.filter((f) => inTab(categoryOf(f, now), tab));
    const ascending = tab === "pending" || tab === "overdue" || tab === "today";
    return list.sort((a, b) => {
      const diff = new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      return ascending ? diff : -diff;
    });
  }, [base, tab, now]);

  // Workload per executive, so the admin can see who is falling behind
  const workload = useMemo(() => {
    const map = new Map<number, { id: number; name: string; pending: number; overdue: number }>();
    followUps.forEach((f) => {
      const row = map.get(f.executive.id) ?? { id: f.executive.id, name: f.executive.name, pending: 0, overdue: 0 };
      const cat = categoryOf(f, now);
      if (PENDING_CATEGORIES.includes(cat)) row.pending++;
      if (cat === "overdue") row.overdue++;
      map.set(row.id, row);
    });
    return Array.from(map.values()).sort(
      (a, b) => b.overdue - a.overdue || b.pending - a.pending || a.name.localeCompare(b.name)
    );
  }, [followUps, now]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Follow-ups</h1>
        <p className="mt-1 text-sm text-slate-600">
          {counts.pending} pending, {counts.overdue} overdue. Executives update their own follow-ups; this page is for
          monitoring.
        </p>
      </div>

      {/* Workload per executive: click a card to filter the table to that person */}
      {workload.length > 0 && (
        <section aria-label="Follow-ups by executive" className="mt-6">
          <h2 className="mb-3 text-base font-semibold text-blue-900">By executive</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {workload.map((w) => {
              const active = executive === String(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setExecutive(active ? "all" : String(w.id));
                    setPage(1);
                  }}
                  className={`rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                    active ? "border-blue-600 bg-blue-50" : "border-blue-100 bg-white hover:border-blue-300"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-slate-900">{w.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="tabular-nums">{w.pending}</span> pending
                    <span className="mx-1.5 text-slate-300" aria-hidden="true">|</span>
                    <span className={`tabular-nums ${w.overdue > 0 ? "font-semibold text-red-600" : ""}`}>
                      {w.overdue}
                    </span>{" "}
                    overdue
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1 sm:max-w-xs">
          <label htmlFor="fu-search" className="sr-only">Search follow-ups</label>
          <input
            id="fu-search"
            type="search"
            placeholder="Search lead name or phone"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className={`${fieldClass} w-full`}
          />
        </div>
        <label htmlFor="fu-exec" className="sr-only">Executive</label>
        <select
          id="fu-exec"
          value={executive}
          onChange={(e) => {
            setExecutive(e.target.value);
            setPage(1);
          }}
          className={fieldClass}
        >
          <option value="all">All executives</option>
          {executives.map((x) => (
            <option key={x.id} value={x.id}>{x.name}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Follow-up status" className="mt-5 flex flex-wrap gap-1 border-b border-blue-100">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                active
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-600 hover:text-blue-700"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                  t.key === "overdue" && counts.overdue > 0
                    ? "bg-red-50 text-red-700"
                    : active
                      ? "bg-blue-50 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-blue-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-blue-50 text-blue-900">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Lead</th>
                <th scope="col" className="px-4 py-3 font-semibold">Executive</th>
                <th scope="col" className="px-4 py-3 font-semibold">Scheduled for</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50 bg-white">
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    {followUps.length === 0 ? "No follow-ups have been scheduled yet." : "No follow-ups here."}
                  </td>
                </tr>
              )}
              {pageRows.map((f) => {
                const cat = categoryOf(f, now);
                const pending = f.status === "PENDING";
                return (
                  <tr key={f.id} className="hover:bg-blue-50/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{f.lead.name}</p>
                      <a href={`tel:${f.lead.phone}`} className="text-slate-500 hover:text-blue-700 hover:underline">
                        {f.lead.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{f.executive.name}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="text-slate-800">{dateTime(f.scheduledAt)}</p>
                      {pending && (
                        <p className={`text-sm ${cat === "overdue" ? "font-medium text-red-600" : "text-slate-500"}`}>
                          {relative(f.scheduledAt, now)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_META[cat].cls}`}>
                        {CATEGORY_META[cat].label}
                      </span>
                    </td>
                    <td className="max-w-[300px] px-4 py-3 text-slate-600">
                      <p className="truncate" title={f.notes ?? undefined}>
                        {f.notes || <span className="text-slate-400">No notes</span>}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 bg-white px-4 py-3 text-sm text-slate-600">
          <p>
            {rows.length === 0
              ? "0 follow-ups"
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1} to ${Math.min(currentPage * PAGE_SIZE, rows.length)} of ${rows.length}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded-lg border border-blue-200 px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-1 tabular-nums">Page {currentPage} of {pageCount}</span>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              className="rounded-lg border border-blue-200 px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}