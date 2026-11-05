import { useEffect, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAssignLeadsMutation, useGetExecutivesQuery, useGetLeadsQuery } from "../../services/leadApi";
import type { Lead } from "../../services/leadApi";

/* ---------- Helpers ---------- */

const PAGE_SIZE = 15;
const NO_LEADS: Lead[] = [];

const budget = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function getErrorMessage(err: unknown): string {
  const e = err as { data?: { message?: string }; error?: string } | undefined;
  return e?.data?.message ?? e?.error ?? "Something went wrong. Please try again.";
}

const fieldClass =
  "rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

/* ---------- Assign form (dialog) ---------- */

function AssignDialog({
  leads,
  onClose,
  onAssigned,
}: {
  leads: Lead[];
  onClose: () => void;
  onAssigned: (count: number, executiveName: string) => void;
}) {
  const uid = useId();
  const { data: executives = [], isLoading, isError } = useGetExecutivesQuery();
  const [assignLeads, { isLoading: saving }] = useAssignLeadsMutation();
  const [executiveId, setExecutiveId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!executiveId) {
      setError("Choose an executive to assign these leads to.");
      return;
    }
    setError("");
    try {
      await assignLeads({ leadIds: leads.map((l) => l.id), executiveId: Number(executiveId) }).unwrap();
      const name = executives.find((x) => String(x.id) === executiveId)?.name ?? "the executive";
      onAssigned(leads.length, name);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const preview = leads.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      <div className="absolute inset-0" onClick={() => !saving && onClose()} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`} className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b border-blue-100 px-6 py-4">
          <h2 id={`${uid}-title`} className="text-lg font-semibold text-slate-900">
            Assign {leads.length} {leads.length === 1 ? "lead" : "leads"}
          </h2>
          <p className="text-sm text-slate-500">The executive will see them under My Leads straight away.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-6 py-5">
            {error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <label htmlFor={`${uid}-exec`} className="mb-1.5 block text-sm font-medium text-slate-800">
                Assign to
              </label>
              <select
                id={`${uid}-exec`}
                value={executiveId}
                onChange={(e) => setExecutiveId(e.target.value)}
                disabled={isLoading || saving}
                autoFocus
                className={`${fieldClass} block w-full`}
              >
                <option value="">{isLoading ? "Loading executives..." : "Select an executive"}</option>
                {executives.map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
              {isError && <p className="mt-1.5 text-sm text-red-700">Could not load executives. Close this and try again.</p>}
              {!isLoading && !isError && executives.length === 0 && (
                <p className="mt-1.5 text-sm text-slate-600">There are no sales executives yet. Add one first.</p>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-800">Leads being assigned</p>
              <ul className="space-y-1 rounded-lg bg-blue-50/60 px-3.5 py-3 text-sm text-slate-700">
                {preview.map((l) => (
                  <li key={l.id} className="flex justify-between gap-3">
                    <span className="truncate">{l.customerName}</span>
                    <span className="shrink-0 text-slate-500">{l.preferredLocation}</span>
                  </li>
                ))}
                {leads.length > preview.length && (
                  <li className="text-slate-500">and {leads.length - preview.length} more</li>
                )}
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-blue-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || isLoading || executives.length === 0}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Assigning..." : "Assign leads"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function UnassignedLeads() {
  const { data, isLoading, isError, error, refetch } = useGetLeadsQuery();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [notice, setNotice] = useState("");

  // Leads nobody owns yet, longest-waiting first
  const unassigned = useMemo(
    () =>
      (data ?? NO_LEADS)
        .filter((l) => l.assignedToId === null)
        .sort((a, b) => new Date(a.enquiryDate).getTime() - new Date(b.enquiryDate).getTime()),
    [data]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter((l) =>
      `${l.customerName} ${l.mobile} ${l.preferredLocation} ${l.propertyCategory} ${l.leadSource}`.toLowerCase().includes(q)
    );
  }, [unassigned, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectedLeads = useMemo(() => unassigned.filter((l) => selected.has(l.id)), [unassigned, selected]);
  const pageAllSelected = pageRows.length > 0 && pageRows.every((l) => selected.has(l.id));
  const pageSomeSelected = pageRows.some((l) => selected.has(l.id));

  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) pageRows.forEach((l) => next.delete(l.id));
      else pageRows.forEach((l) => next.add(l.id));
      return next;
    });

  const selectAllFiltered = () => setSelected(new Set(filtered.map((l) => l.id)));

  const handleAssigned = (count: number, executiveName: string) => {
    setAssigning(false);
    setSelected(new Set());
    setNotice(`Assigned ${count} ${count === 1 ? "lead" : "leads"} to ${executiveName}.`);
  };

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <Link to="/admin/dashboard" className="text-sm font-medium text-blue-700 hover:underline">
          ← Back to dashboard
        </Link>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Unassigned leads</h1>
            <p className="mt-1 text-sm text-slate-600">
              {isLoading
                ? "Loading leads..."
                : `${unassigned.length} ${unassigned.length === 1 ? "lead is" : "leads are"} waiting for an executive. Select the ones to assign.`}
            </p>
          </div>
          <div className="w-full sm:w-72">
            <label htmlFor="ul-search" className="sr-only">Search unassigned leads</label>
            <input
              id="ul-search"
              type="search"
              placeholder="Search name, phone, location or source"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className={`${fieldClass} w-full`}
            />
          </div>
        </div>

        <p role="status" className="mt-3 min-h-5 text-sm text-emerald-700">
          {notice}
        </p>

        {isError && (
          <div
            role="alert"
            className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{getErrorMessage(error)}</span>
            <button type="button" onClick={refetch} className="font-medium underline">
              Try again
            </button>
          </div>
        )}

        {/* Selection bar */}
        {selected.size > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-sm text-blue-900">
              <span className="font-semibold tabular-nums">{selected.size}</span> selected
              {filtered.length > selected.size && (
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="ml-3 font-medium text-blue-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  Select all {filtered.length}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="ml-3 font-medium text-blue-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                Clear
              </button>
            </p>
            <button
              type="button"
              onClick={() => setAssigning(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              Assign to executive
            </button>
          </div>
        )}

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-blue-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-blue-50 text-blue-900">
                <tr>
                  <th scope="col" className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all leads on this page"
                      checked={pageAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = pageSomeSelected && !pageAllSelected;
                      }}
                      onChange={togglePage}
                      disabled={pageRows.length === 0}
                      className="h-4 w-4 rounded border-blue-300 accent-blue-600"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Property</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Preferred location</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Budget</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Source</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Enquiry date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50 bg-white">
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-5 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))}

                {!isLoading && !isError && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      {unassigned.length === 0 ? (
                        <>
                          All leads are assigned. Nothing is waiting.{" "}
                          <Link to="/admin/dashboard" className="font-medium text-blue-700 hover:underline">
                            Back to dashboard
                          </Link>
                        </>
                      ) : (
                        "No unassigned leads match your search."
                      )}
                    </td>
                  </tr>
                )}

                {pageRows.map((l) => {
                  const checked = selected.has(l.id);
                  return (
                    <tr key={l.id} className={checked ? "bg-blue-50/60" : "hover:bg-blue-50/40"}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${l.customerName}`}
                          checked={checked}
                          onChange={() => toggleOne(l.id)}
                          className="h-4 w-4 rounded border-blue-300 accent-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{l.customerName}</p>
                        <a href={`tel:${l.mobile}`} className="text-slate-500 hover:text-blue-700 hover:underline">
                          {l.mobile}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{l.propertyCategory}</td>
                      <td className="px-4 py-3 text-slate-800">{l.preferredLocation}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-800">{budget(l.budget)}</td>
                      <td className="px-4 py-3 text-slate-700">{l.leadSource}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{shortDate(l.enquiryDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 bg-white px-4 py-3 text-sm text-slate-600">
            <p>
              {filtered.length === 0
                ? "0 leads"
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

      {assigning && selectedLeads.length > 0 && (
        <AssignDialog leads={selectedLeads} onClose={() => setAssigning(false)} onAssigned={handleAssigned} />
      )}
    </>
  );
}