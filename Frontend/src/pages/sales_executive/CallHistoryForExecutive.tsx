import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CALL_OUTCOMES, useGetMyCallsQuery } from "../../services/excecutiveLeadApi";
import type { CallOutcome } from "../../services/excecutiveLeadApi";
import { FIELD_CLASS, formatDateTime, formatDuration, getErrorMessage, humanize } from "./LeadUtils";

/* ---------- Filters ---------- */

type Period = "all" | "today" | "7d" | "30d";

const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

const PAGE_SIZE = 20;

/** Earliest date that belongs to the period (null = no limit) */
function periodStart(period: Period): number | null {
  const now = new Date();
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (period === "7d") return now.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (period === "30d") return now.getTime() - 30 * 24 * 60 * 60 * 1000;
  return null;
}

/** 135 -> "2h 15m" */
function formatTotalTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/* ---------- Page ---------- */

export default function CallHistory() {
  const { data: calls = [], isLoading, isFetching, isError, error, refetch } = useGetMyCallsQuery();

  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const [period, setPeriod] = useState<Period>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Any filter change starts again from the first page
  const onSearch = (v: string) => {
    setSearch(v);
    setLimit(PAGE_SIZE);
  };
  const onOutcome = (v: CallOutcome | "") => {
    setOutcome(v);
    setLimit(PAGE_SIZE);
  };
  const onPeriod = (v: Period) => {
    setPeriod(v);
    setLimit(PAGE_SIZE);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const start = periodStart(period);
    return calls
      .filter((c) => {
        if (outcome && c.outcome !== outcome) return false;
        if (start !== null && new Date(c.callDateTime).getTime() < start) return false;
        if (!q) return true;
        return (
          c.lead.customerName.toLowerCase().includes(q) ||
          c.lead.mobile.includes(q) ||
          (c.notes ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.callDateTime).getTime() - new Date(a.callDateTime).getTime());
  }, [calls, search, outcome, period]);

  const totalMinutes = useMemo(() => filtered.reduce((sum, c) => sum + c.duration, 0), [filtered]);
  const visible = filtered.slice(0, limit);
  const isFiltered = Boolean(search.trim() || outcome || period !== "all");

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Call History</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isLoading
            ? "Loading calls…"
            : `${filtered.length} ${filtered.length === 1 ? "call" : "calls"} · ${formatTotalTime(totalMinutes)} talk time`}
          {isFetching && !isLoading && " · updating…"}
        </p>
      </header>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="call-search" className="sr-only">
            Search calls
          </label>
          <input
            id="call-search"
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by customer, mobile or notes"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="call-outcome-filter" className="sr-only">
            Filter by outcome
          </label>
          <select
            id="call-outcome-filter"
            value={outcome}
            onChange={(e) => onOutcome(e.target.value as CallOutcome | "")}
            className={FIELD_CLASS}
          >
            <option value="">All outcomes</option>
            {CALL_OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {humanize(o)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="call-period" className="sr-only">
            Filter by date
          </label>
          <select
            id="call-period"
            value={period}
            onChange={(e) => onPeriod(e.target.value as Period)}
            className={FIELD_CLASS}
          >
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isError && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{getErrorMessage(error)}</span>
          <button type="button" onClick={refetch} className="font-medium underline">
            Try again
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-blue-100 bg-blue-50/50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Date</th>
              <th scope="col" className="px-4 py-3 font-medium">Customer</th>
              <th scope="col" className="px-4 py-3 font-medium">Duration</th>
              <th scope="col" className="px-4 py-3 font-medium">Outcome</th>
              <th scope="col" className="px-4 py-3 font-medium">Notes</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50">
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-4">
                    <div className="h-5 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))}

            {!isLoading && filtered.length === 0 && !isError && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  {isFiltered
                    ? "No calls match your filters."
                    : "No calls recorded yet. Log a call from a lead's details page."}
                </td>
              </tr>
            )}

            {visible.map((call) => (
              <tr key={call.id} className="hover:bg-blue-50/40">
                <td className="whitespace-nowrap px-4 py-3 text-slate-900">{formatDateTime(call.callDateTime)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{call.lead.customerName}</p>
                  <a href={`tel:${call.lead.mobile}`} className="text-xs text-blue-700 hover:underline">
                    {call.lead.mobile}
                  </a>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDuration(call.duration)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{humanize(call.outcome)}</td>
                <td className="max-w-xs px-4 py-3 text-slate-700">{call.notes || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/executive/leads/${call.lead.id}`}
                    className="rounded-lg px-3 py-1.5 font-medium text-blue-700 transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    View lead
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paging */}
      {filtered.length > visible.length && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-500">
          <span>
            Showing {visible.length} of {filtered.length}
          </span>
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="rounded-lg border border-blue-200 px-3.5 py-2 font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            Show more
          </button>
        </div>
      )}
    </div>
  );
}