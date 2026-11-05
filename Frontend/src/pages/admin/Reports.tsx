import { useMemo, useState } from "react";
import { useGetExecutivePerformanceReportQuery } from "../../services/adminApi";
import { FORMULAS, RANGE_LABELS, ZERO_RULE, exportCsv, exportExcel, humanize } from "./Reports/ReportExport";

/* ---------- Types (match the reportController response) ---------- */

export type ReportRange = "today" | "7d" | "30d" | "all";

export interface ExecutiveReportRow {
  id: number;
  name: string;
  email: string;
  assignedLeads: number;
  leadsContacted: number;
  /** Unique assigned leads contacted / total assigned leads x 100 */
  callCoverageRate: number;
  totalCalls: number;
  connectedCalls: number;
  /** Connected calls / total calls x 100 */
  connectionRate: number;
  convertedLeads: number;
  /** Converted leads / total assigned leads x 100 */
  conversionRate: number;
}

export type TeamTotals = Omit<ExecutiveReportRow, "id" | "name" | "email">;

export interface PerformanceReport {
  range: ReportRange;
  from: string | null;
  generatedAt: string;
  connectedOutcomes: string[];
  executives: ExecutiveReportRow[];
  totals: TeamTotals;
}

/* ---------- Helpers ---------- */

type MetricKey = Exclude<keyof ExecutiveReportRow, "id" | "email" | "name">;
type SortKey = MetricKey | "name";

const METRIC_COLUMNS: { key: MetricKey; label: string; rate?: boolean }[] = [
  { key: "assignedLeads", label: "Assigned leads" },
  { key: "leadsContacted", label: "Contacted" },
  { key: "callCoverageRate", label: "Call coverage", rate: true },
  { key: "totalCalls", label: "Calls" },
  { key: "connectedCalls", label: "Connected" },
  { key: "connectionRate", label: "Connection rate", rate: true },
  { key: "convertedLeads", label: "Converted" },
  { key: "conversionRate", label: "Conversion rate", rate: true },
];

const nf = new Intl.NumberFormat("en-IN");
/** 75 -> "75%", 66.7 -> "66.7%" */
const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

function getErrorMessage(err: unknown): string {
  const e = err as { data?: { message?: string }; error?: string } | undefined;
  return e?.data?.message ?? e?.error ?? "Could not load the report.";
}

const fieldClass =
  "rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

/* ---------- Small components ---------- */

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-5">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{note}</p>
    </div>
  );
}

function RateCell({ value }: { value: number }) {
  return (
    <div className="ml-auto flex w-36 items-center justify-end gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-100" aria-hidden="true">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="w-14 text-right tabular-nums">{pct(value)}</span>
    </div>
  );
}

const downloadButton =
  "rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50";

/* ---------- Page ---------- */

export default function Reports() {
  const [range, setRange] = useState<ReportRange>("30d");
  const { data, isLoading, isFetching, isError, error, refetch } = useGetExecutivePerformanceReportQuery(range);

  const [sortKey, setSortKey] = useState<SortKey>("conversionRate");
  const [sortDesc, setSortDesc] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const rows = useMemo(() => {
    const list = [...(data?.executives ?? [])];
    return list.sort((a, b) => {
      const cmp =
        sortKey === "name" ? a.name.localeCompare(b.name) : (a[sortKey] as number) - (b[sortKey] as number);
      return sortDesc ? -cmp : cmp;
    });
  }, [data, sortKey, sortDesc]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(key !== "name");
    }
  };

  const handleExcel = async () => {
    if (!data) return;
    setExportError("");
    setExporting(true);
    try {
      await exportExcel(data);
    } catch {
      setExportError("Could not create the Excel file. Try the CSV download instead.");
    } finally {
      setExporting(false);
    }
  };

  // The file always matches what is on screen, so downloads wait until a new period has loaded
  const canDownload = Boolean(data) && !isFetching && !exporting;
  const t = data?.totals;

  const sortableHeader = (key: SortKey, label: string, numeric: boolean) => {
    const active = sortKey === key;
    return (
      <th
        key={key}
        scope="col"
        aria-sort={active ? (sortDesc ? "descending" : "ascending") : "none"}
        className={`px-4 py-3 font-semibold ${numeric ? "text-right" : ""}`}
      >
        <button
          type="button"
          onClick={() => handleSort(key)}
          className="inline-flex items-center gap-1 rounded hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          {label}
          <span aria-hidden="true" className={active ? "text-blue-700" : "text-blue-200"}>
            {active ? (sortDesc ? "▼" : "▲") : "▼"}
          </span>
        </button>
      </th>
    );
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Heading, period and downloads */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports and analytics</h1>
          <p className="mt-1 text-sm text-slate-600">
            How each sales executive is performing: coverage, connection and conversion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="report-range" className="sr-only">Period</label>
          <select
            id="report-range"
            value={range}
            onChange={(e) => setRange(e.target.value as ReportRange)}
            className={fieldClass}
          >
            {(Object.keys(RANGE_LABELS) as ReportRange[]).map((key) => (
              <option key={key} value={key}>{RANGE_LABELS[key]}</option>
            ))}
          </select>
          <button type="button" onClick={() => data && exportCsv(data)} disabled={!canDownload} className={downloadButton}>
            Download CSV
          </button>
          <button type="button" onClick={handleExcel} disabled={!canDownload} className={downloadButton}>
            {exporting ? "Preparing..." : "Download Excel"}
          </button>
        </div>
      </div>

      {data && (
        <p className="mt-2 text-sm text-slate-500">
          {RANGE_LABELS[data.range]}
          {data.from && ` (from ${new Date(data.from).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})`}
          . Generated {new Date(data.generatedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}.
          {isFetching && " Updating..."}
        </p>
      )}

      {exportError && (
        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {exportError}
        </p>
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

      {/* Team summary */}
      <section aria-label="Team summary" className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-blue-900">Whole team</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {isLoading || !t ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />)
          ) : (
            <>
              <MetricCard
                label="Call coverage rate"
                value={pct(t.callCoverageRate)}
                note={`${nf.format(t.leadsContacted)} of ${nf.format(t.assignedLeads)} assigned leads contacted`}
              />
              <MetricCard
                label="Connection rate"
                value={pct(t.connectionRate)}
                note={`${nf.format(t.connectedCalls)} of ${nf.format(t.totalCalls)} calls connected`}
              />
              <MetricCard
                label="Conversion rate"
                value={pct(t.conversionRate)}
                note={`${nf.format(t.convertedLeads)} of ${nf.format(t.assignedLeads)} assigned leads converted`}
              />
            </>
          )}
        </div>
      </section>

      {/* Per executive */}
      <section aria-label="Performance per executive" className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-blue-900">Performance per executive</h2>
        <div className={`overflow-hidden rounded-xl border border-blue-100 transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-blue-50 text-blue-900">
                <tr>
                  {sortableHeader("name", "Executive", false)}
                  {METRIC_COLUMNS.map((c) => sortableHeader(c.key, c.label, true))}
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50 bg-white">
                {isLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={9} className="px-4 py-4">
                        <div className="h-5 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))}

                {!isLoading && !isError && rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      There are no sales executives yet.
                    </td>
                  </tr>
                )}

                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      <p className="text-slate-500">{r.email}</p>
                    </td>
                    {METRIC_COLUMNS.map((c) =>
                      c.rate ? (
                        <td key={c.key} className="px-4 py-3">
                          <RateCell value={r[c.key]} />
                        </td>
                      ) : (
                        <td key={c.key} className="px-4 py-3 text-right tabular-nums">
                          {nf.format(r[c.key])}
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>

              {t && rows.length > 0 && (
                <tfoot className="border-t border-blue-100 bg-blue-50/60 font-semibold text-slate-900">
                  <tr>
                    <th scope="row" className="px-4 py-3 text-left">Team total</th>
                    {METRIC_COLUMNS.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-right tabular-nums">
                        {c.rate ? pct(t[c.key]) : nf.format(t[c.key])}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </section>

      {/* How the numbers are worked out */}
      <section aria-label="How the metrics are calculated" className="mt-8">
        <details className="group rounded-xl border border-blue-100 bg-white">
          <summary className="cursor-pointer list-none rounded-xl px-5 py-4 text-base font-semibold text-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
            How these numbers are calculated
            <span className="ml-2 text-sm font-normal text-slate-500 group-open:hidden">Show</span>
            <span className="ml-2 hidden text-sm font-normal text-slate-500 group-open:inline">Hide</span>
          </summary>

          <div className="space-y-5 border-t border-blue-100 px-5 py-5">
            <dl className="space-y-4">
              {FORMULAS.map((f) => (
                <div key={f.name}>
                  <dt className="font-medium text-slate-900">{f.name}</dt>
                  <dd className="mt-0.5 text-sm text-slate-700">
                    <span className="font-mono text-[13px] text-blue-900">{f.formula}</span>
                    <span className="mt-0.5 block text-slate-500">{f.note}</span>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Counted as connected: </span>
                {data ? data.connectedOutcomes.map(humanize).join(", ") : "..."}.
              </p>
              <p className="mt-1">
                <span className="font-medium text-slate-900">Not connected: </span>
                Busy, Not answered, Switched off.
              </p>
              <p className="mt-1 text-slate-500">{ZERO_RULE}</p>
            </div>
          </div>
        </details>
      </section>
    </main>
  );
}