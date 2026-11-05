import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useGetAllCallsQuery } from "../../services/adminApi";

/* ---------- Types (match your Prisma schema) ---------- */

/** Same values as the Prisma enum CallOutcome */
export type CallOutcome =
  | "CONNECTED"
  | "NOT_ANSWERED"
  | "BUSY"
  | "SWITCHED_OFF"
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "CALL_BACK_REQUESTED"
  | "VISIT_SCHEDULED"
  | "CONVERTED";

/**
 * A Call row from the getAllCalls controller (GET /calls), with the lead and executive included.
 * Dates arrive as ISO strings once the result goes through JSON.
 */
export interface CallRecord {
  id: number;
  leadId: number;
  executiveId: number;
  callDateTime: string;
  /** Talk time in seconds */
  duration: number;
  outcome: CallOutcome;
  notes: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  lead: { id: number; customerName: string; mobile: string };
  executive: { id: number; name: string };
}

type RangeKey = "today" | "7d" | "30d" | "all";

/* ---------- Helpers ---------- */

/** Stable empty list, so memoised values don't recalculate on every render while loading */
const NO_CALLS: CallRecord[] = [];

const OUTCOME_META: Record<CallOutcome, { label: string; cls: string }> = {
  CONNECTED: { label: "Connected", cls: "bg-emerald-50 text-emerald-700" },
  NOT_ANSWERED: { label: "Not answered", cls: "bg-slate-100 text-slate-600" },
  BUSY: { label: "Busy", cls: "bg-amber-50 text-amber-700" },
  SWITCHED_OFF: { label: "Switched off", cls: "bg-slate-100 text-slate-600" },
  INTERESTED: { label: "Interested", cls: "bg-indigo-50 text-indigo-700" },
  NOT_INTERESTED: { label: "Not interested", cls: "bg-red-50 text-red-700" },
  CALL_BACK_REQUESTED: { label: "Call back requested", cls: "bg-sky-50 text-sky-700" },
  VISIT_SCHEDULED: { label: "Visit scheduled", cls: "bg-violet-50 text-violet-700" },
  CONVERTED: { label: "Converted", cls: "bg-emerald-100 text-emerald-800" },
};
const OUTCOME_LIST = Object.keys(OUTCOME_META) as CallOutcome[];

const NO_ANSWER: CallOutcome[] = ["NOT_ANSWERED", "BUSY", "SWITCHED_OFF"];

/** A call counts as connected when the customer picked up, whatever the result was. */
const isConnected = (o: CallOutcome) => !NO_ANSWER.includes(o);

const PAGE_SIZE = 10;
const nf = new Intl.NumberFormat("en-IN");

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

const dateTimeLong = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

function duration(sec: number): string {
  if (sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

function rangeStart(range: RangeKey): number {
  if (range === "all") return 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "7d") d.setDate(d.getDate() - 6);
  if (range === "30d") d.setDate(d.getDate() - 29);
  return d.getTime();
}

function getErrorMessage(err: unknown): string {
  const e = err as { data?: { message?: string }; error?: string } | undefined;
  return e?.data?.message ?? e?.error ?? "Could not load call history.";
}

function downloadCsv(rows: CallRecord[]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["Lead", "Mobile", "Executive", "Call date and time", "Duration (sec)", "Outcome", "Next follow-up", "Notes"];
  const lines = rows.map((c) =>
    [c.lead.customerName, c.lead.mobile, c.executive.name, c.callDateTime, c.duration, OUTCOME_META[c.outcome].label, c.nextFollowUpAt ?? "", c.notes ?? ""]
      .map(esc)
      .join(",")
  );
  const blob = new Blob(["\uFEFF" + [header.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pgfy-call-history.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const fieldClass =
  "rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

/* ---------- Small components ---------- */

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-4">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
      {note && <p className="mt-0.5 text-sm text-slate-500">{note}</p>}
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: CallOutcome }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${OUTCOME_META[outcome].cls}`}>
      {OUTCOME_META[outcome].label}
    </span>
  );
}

function CallDetails({
  call,
  leadCallCount,
  onClose,
  onShowLeadHistory,
}: {
  call: CallRecord;
  leadCallCount: number;
  onClose: () => void;
  onShowLeadHistory: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: [string, ReactNode][] = [
    ["Executive", call.executive.name],
    ["Call date and time", dateTimeLong(call.callDateTime)],
    ["Duration", duration(call.duration)],
    ["Outcome", <OutcomeBadge key="o" outcome={call.outcome} />],
    ["Next follow-up", call.nextFollowUpAt ? dateTimeLong(call.nextFollowUpAt) : "None set"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="call-title" className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-blue-100 px-6 py-4">
          <div>
            <h2 id="call-title" className="text-lg font-semibold text-slate-900">{call.lead.customerName}</h2>
            <a href={`tel:${call.lead.mobile}`} className="text-sm text-blue-700 hover:underline">{call.lead.mobile}</a>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            autoFocus
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2.5 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-800">Notes</p>
            <p className="rounded-lg bg-blue-50/60 px-3.5 py-3 text-sm leading-relaxed text-slate-700">
              {call.notes || "No notes were added for this call."}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-blue-100 px-6 py-4">
          <p className="text-sm text-slate-500">Call records can't be edited or deleted.</p>
          {leadCallCount > 1 && (
            <button
              type="button"
              onClick={onShowLeadHistory}
              className="shrink-0 rounded-lg border border-blue-200 px-3.5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              All {leadCallCount} calls with this lead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function CallHistory() {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetAllCallsQuery();
  const calls = data ?? NO_CALLS;

  const [query, setQuery] = useState("");
  const [executive, setExecutive] = useState("all");
  const [outcome, setOutcome] = useState<CallOutcome | "all">("all");
  const [range, setRange] = useState<RangeKey>("7d");
  const [leadId, setLeadId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<CallRecord | null>(null);

  const executives = useMemo(() => {
    const map = new Map<number, string>();
    calls.forEach((c) => map.set(c.executive.id, c.executive.name));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [calls]);

  const callsPerLead = useMemo(() => {
    const map = new Map<number, number>();
    calls.forEach((c) => map.set(c.leadId, (map.get(c.leadId) ?? 0) + 1));
    return map;
  }, [calls]);

  const leadFilterName = leadId !== null ? calls.find((c) => c.leadId === leadId)?.lead.customerName : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = rangeStart(range);
    return [...calls]
      .sort((a, b) => new Date(b.callDateTime).getTime() - new Date(a.callDateTime).getTime())
      .filter((c) => {
        if (leadId !== null && c.leadId !== leadId) return false;
        if (new Date(c.callDateTime).getTime() < from) return false;
        if (executive !== "all" && String(c.executiveId) !== executive) return false;
        if (outcome !== "all" && c.outcome !== outcome) return false;
        if (q && !`${c.lead.customerName} ${c.lead.mobile}`.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [calls, query, executive, outcome, range, leadId]);

  const stats = useMemo(() => {
    const connected = filtered.filter((c) => isConnected(c.outcome));
    const talking = connected.filter((c) => c.duration > 0);
    const talk = talking.reduce((sum, c) => sum + c.duration, 0);
    return {
      total: filtered.length,
      connected: connected.length,
      rate: filtered.length ? (connected.length / filtered.length) * 100 : 0,
      avg: talking.length ? Math.round(talk / talking.length) : 0,
    };
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const changeFilter = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const showLeadHistory = (id: number) => {
    setLeadId(id);
    setRange("all"); // a lead's full history, not just the recent calls
    setExecutive("all");
    setOutcome("all");
    setQuery("");
    setPage(1);
    setViewing(null);
  };

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {/* Heading */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Call history</h1>
            <p className="mt-1 text-sm text-slate-600">
              Every call your sales team has made. Records are kept as logged and can't be changed.
              {isFetching && !isLoading && <span className="text-slate-500"> Updating…</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadCsv(filtered)}
            disabled={isLoading || filtered.length === 0}
            className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1 sm:max-w-xs">
            <label htmlFor="call-search" className="sr-only">Search calls</label>
            <input
              id="call-search"
              type="search"
              placeholder="Search customer name or mobile"
              value={query}
              onChange={(e) => changeFilter(setQuery)(e.target.value)}
              className={`${fieldClass} w-full`}
            />
          </div>

          <label htmlFor="call-range" className="sr-only">Date range</label>
          <select id="call-range" value={range} onChange={(e) => changeFilter(setRange)(e.target.value as RangeKey)} className={fieldClass}>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>

          <label htmlFor="call-exec" className="sr-only">Executive</label>
          <select id="call-exec" value={executive} onChange={(e) => changeFilter(setExecutive)(e.target.value)} className={fieldClass}>
            <option value="all">All executives</option>
            {executives.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>

          <label htmlFor="call-outcome" className="sr-only">Outcome</label>
          <select id="call-outcome" value={outcome} onChange={(e) => changeFilter(setOutcome)(e.target.value as CallOutcome | "all")} className={fieldClass}>
            <option value="all">All outcomes</option>
            {OUTCOME_LIST.map((o) => (
              <option key={o} value={o}>{OUTCOME_META[o].label}</option>
            ))}
          </select>
        </div>

        {leadId !== null && (
          <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-blue-200 bg-blue-50 py-1.5 pl-4 pr-2 text-sm text-blue-900">
            <span>
              Showing every call with <span className="font-semibold">{leadFilterName ?? `lead #${leadId}`}</span>
            </span>
            <button
              type="button"
              onClick={() => changeFilter(setLeadId)(null)}
              className="rounded-full bg-white px-2.5 py-0.5 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              Clear
            </button>
          </div>
        )}

        {isError && (
          <div
            role="alert"
            className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{getErrorMessage(error)}</span>
            <button type="button" onClick={refetch} className="font-medium underline">
              Try again
            </button>
          </div>
        )}

        {/* Summary for the current filters */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total calls" value={isLoading ? "…" : nf.format(stats.total)} />
          <Stat label="Connected calls" value={isLoading ? "…" : nf.format(stats.connected)} note="Customer picked up" />
          <Stat label="Connect rate" value={isLoading ? "…" : `${stats.rate.toFixed(0)}%`} />
          <Stat label="Average talk time" value={isLoading ? "…" : duration(stats.avg)} note="Connected calls only" />
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-blue-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-blue-50 text-blue-900">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Lead</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Executive</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Date and time</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Duration</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Outcome</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Next follow-up</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Notes</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50 bg-white">
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-4 py-4">
                        <div className="h-5 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))}
                {!isLoading && !isError && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      {calls.length === 0 ? "No calls have been logged yet." : "No calls match these filters."}
                    </td>
                  </tr>
                )}
                {pageRows.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/40">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => showLeadHistory(c.leadId)}
                        title="Show every call with this lead"
                        className="rounded text-left font-medium text-slate-900 hover:text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                      >
                        {c.lead.customerName}
                      </button>
                      <a href={`tel:${c.lead.mobile}`} className="block text-slate-500 hover:text-blue-700 hover:underline">
                        {c.lead.mobile}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{c.executive.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{dateTime(c.callDateTime)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">{duration(c.duration)}</td>
                    <td className="px-4 py-3"><OutcomeBadge outcome={c.outcome} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {c.nextFollowUpAt ? dateTime(c.nextFollowUpAt) : <span className="text-slate-400">None</span>}
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-slate-600">
                      <p className="truncate" title={c.notes ?? undefined}>
                        {c.notes || <span className="text-slate-400">No notes</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setViewing(c)}
                        aria-label={`View call with ${c.lead.customerName}`}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 bg-white px-4 py-3 text-sm text-slate-600">
            <p>
              {filtered.length === 0
                ? "0 calls"
                : `Showing ${(currentPage - 1) * PAGE_SIZE + 1} to ${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
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

      {viewing && (
        <CallDetails
          call={viewing}
          leadCallCount={callsPerLead.get(viewing.leadId) ?? 1}
          onClose={() => setViewing(null)}
          onShowLeadHistory={() => showLeadHistory(viewing.leadId)}
        />
      )}
    </>
  );
}