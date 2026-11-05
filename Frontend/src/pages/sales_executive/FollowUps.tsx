import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useGetMyFollowUpsQuery, useUpdateFollowUpStatusMutation } from "../../services/excecutiveLeadApi";
import type { ExecutiveFollowUp, FollowUpStatus } from "../../services/excecutiveLeadApi";
import { FIELD_CLASS, followUpDisplay, formatDateTime, getErrorMessage } from "./LeadUtils";

/* ---------- Tabs ---------- */

type Category = "overdue" | "upcoming" | "completed" | "cancelled";
type TabKey = Category | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

const EMPTY_TEXT: Record<TabKey, string> = {
  upcoming: "No upcoming follow-ups.",
  overdue: "Nothing overdue. You're all caught up.",
  completed: "No completed follow-ups yet.",
  cancelled: "No cancelled follow-ups.",
  all: "No follow-ups yet. Schedule one from a lead's details page.",
};

function categoryOf(f: ExecutiveFollowUp): Category {
  if (f.status === "COMPLETED") return "completed";
  if (f.status === "CANCELLED") return "cancelled";
  return new Date(f.scheduledAt).getTime() < Date.now() ? "overdue" : "upcoming";
}

/* ---------- Page ---------- */

export default function FollowUps() {
  const { data: followUps = [], isLoading, isFetching, isError, error, refetch } = useGetMyFollowUpsQuery();
  const [updateStatus] = useUpdateFollowUpStatusMutation();

  const [tab, setTab] = useState<TabKey>("upcoming");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Counts for the tabs
  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { upcoming: 0, overdue: 0, completed: 0, cancelled: 0, all: followUps.length };
    followUps.forEach((f) => (c[categoryOf(f)] += 1));
    return c;
  }, [followUps]);

  // Rows for the selected tab and search
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = followUps.filter((f) => {
      if (tab !== "all" && categoryOf(f) !== tab) return false;
      if (!q) return true;
      return (
        f.lead.customerName.toLowerCase().includes(q) ||
        f.lead.mobile.includes(q) ||
        (f.notes ?? "").toLowerCase().includes(q)
      );
    });
    // Things to do come soonest first; history comes newest first
    const soonestFirst = tab === "upcoming" || tab === "overdue" || tab === "all";
    return list.sort((a, b) => {
      const diff = new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      return soonestFirst ? diff : -diff;
    });
  }, [followUps, tab, search]);

  const change = async (f: ExecutiveFollowUp, status: FollowUpStatus) => {
    if (status === "CANCELLED" && !window.confirm(`Cancel the follow-up with ${f.lead.customerName}?`)) return;
    setActionError(null);
    setBusyId(f.id);
    try {
      await updateStatus({ id: f.id, status }).unwrap();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Follow-ups</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isLoading
            ? "Loading follow-ups…"
            : `${counts.upcoming + counts.overdue} pending`}
          {isFetching && !isLoading && " · updating…"}
        </p>
      </header>

      {/* Tabs */}
      <div role="tablist" aria-label="Follow-up status" className="mb-4 flex gap-1 overflow-x-auto border-b border-blue-100">
        {TABS.map(({ key, label }) => {
          const selected = tab === key;
          const alert = key === "overdue" && counts.overdue > 0;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="followups-panel"
              onClick={() => setTab(key)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                selected
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-600 hover:text-blue-700"
              }`}
            >
              {label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  alert ? "bg-red-50 text-red-700" : selected ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4 sm:max-w-sm">
        <label htmlFor="fu-search" className="sr-only">
          Search follow-ups
        </label>
        <input
          id="fu-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer, mobile or notes"
          className={FIELD_CLASS}
        />
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
      {actionError && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {/* Table */}
      <div id="followups-panel" role="tabpanel" className="overflow-x-auto rounded-xl border border-blue-100 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-blue-100 bg-blue-50/50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Customer</th>
              <th scope="col" className="px-4 py-3 font-medium">Scheduled</th>
              <th scope="col" className="px-4 py-3 font-medium">Notes</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-4">
                    <div className="h-5 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))}

            {!isLoading && rows.length === 0 && !isError && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  {search.trim() ? "No follow-ups match your search." : EMPTY_TEXT[tab]}
                </td>
              </tr>
            )}

            {rows.map((f) => {
              const badge = followUpDisplay(f);
              const pending = f.status === "PENDING";
              const busy = busyId === f.id;
              return (
                <tr key={f.id} className="hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{f.lead.customerName}</p>
                    <a href={`tel:${f.lead.mobile}`} className="text-xs text-blue-700 hover:underline">
                      {f.lead.mobile}
                    </a>
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 ${
                      badge.label === "Overdue" ? "font-medium text-red-700" : "text-slate-700"
                    }`}
                  >
                    {formatDateTime(f.scheduledAt)}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-700">{f.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {pending && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => change(f, "COMPLETED")}
                            className="rounded-lg px-3 py-1.5 font-medium text-emerald-700 transition-colors hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-50"
                          >
                            {busy ? "Saving…" : "Done"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => change(f, "CANCELLED")}
                            className="rounded-lg px-3 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      <Link
                        to={`/executive/leads/${f.lead.id}`}
                        className="rounded-lg px-3 py-1.5 font-medium text-blue-700 transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                      >
                        View lead
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}