import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LEAD_STATUSES, useGetMyLeadsQuery } from "../../services/excecutiveLeadApi";
import type { LeadStatus } from "../../services/leadApi";
import { FIELD_CLASS, StatusBadge, formatBudget, formatDate, getErrorMessage, humanize } from "./LeadUtils";

export default function MyLeads() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "">("");

  // Wait until the user stops typing before calling the API
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data: leads = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetMyLeadsQuery({ search: debouncedSearch, status });

  console.log(leads);

  const isFiltered = Boolean(debouncedSearch || status);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Leads</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isLoading ? "Loading leads…" : `${leads.length} ${leads.length === 1 ? "lead" : "leads"}`}
          {isFetching && !isLoading && " · updating…"}
        </p>
      </header>

      {/* Search and filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="lead-search" className="sr-only">
            Search leads
          </label>
          <input
            id="lead-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile or email"
            className={FIELD_CLASS}
          />
        </div>
        <div className="sm:w-56">
          <label htmlFor="lead-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="lead-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus | "")}
            className={FIELD_CLASS}
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
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
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-blue-100 bg-blue-50/50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Customer</th>
              <th scope="col" className="px-4 py-3 font-medium">Budget</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Last Call</th>
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

            {!isLoading && leads.length === 0 && !isError && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  {isFiltered ? "No leads match your search or filter." : "No leads are assigned to you yet."}
                </td>
              </tr>
            )}

            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-blue-50/40">
                <td className="px-4 py-3 font-medium text-slate-900">{lead.customerName}</td>
                <td className="px-4 py-3 text-slate-700">{formatBudget(lead.budget)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 text-slate-700">{formatDate(lead.lastCallAt, "Never")}</td>
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
  );
}