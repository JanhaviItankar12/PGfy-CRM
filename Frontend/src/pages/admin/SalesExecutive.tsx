import { useMemo, useState } from "react";

import { useGetExecutiveFullDataQuery } from "../../services/leadApi";

/* ---------- Types ---------- */

export interface SalesExecutive {
  executiveInfo: {
    id: number;
    name: string;
    email: string;
    joinedAt: string;
  };
  summary: {
    totalAssignedLeads: number;
    convertedLeads: number;
    pendingFollowUps: number;
  };
}

/* ---------- Helpers ---------- */

const numberFormatter = new Intl.NumberFormat("en-IN");

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatJoinedDate(date: string): string {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const searchInputClass =
  "block w-full rounded-lg border border-blue-200 bg-white px-3 py-2 " +
  "text-sm text-slate-900 placeholder:text-slate-400 outline-none " +
  "focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

/* ---------- Page ---------- */

export default function SalesExecutives() {
  const {
    data: executives = [],
    isLoading,
    isError,
    refetch,
  } = useGetExecutiveFullDataQuery();

  const [query, setQuery] = useState("");

  const filteredExecutives = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return executives;
    }

    return executives.filter(({ executiveInfo }) => {
      return (
        executiveInfo.name.toLowerCase().includes(normalizedQuery) ||
        executiveInfo.email.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [executives, query]);

  if (isLoading) {
    return (
      <main className="flex justify-center py-16">
        <p className="text-slate-500">Loading executives...</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="py-10 text-center">
        <p className="text-red-600">Failed to load executives.</p>

        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Sales executives
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            {executives.length}{" "}
            {executives.length === 1
              ? "sales executive"
              : "sales executives"}
            .
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1 sm:max-w-xs">
          <label htmlFor="executive-search" className="sr-only">
            Search executives
          </label>

          <input
            id="executive-search"
            type="search"
            placeholder="Search name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={searchInputClass}
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-blue-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-blue-50 text-blue-900">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Executive
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold"
                >
                  Assigned Leads
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold"
                >
                  Converted Leads
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold"
                >
                  Pending Follow-ups
                </th>

                <th scope="col" className="px-4 py-3 font-semibold">
                  Joined
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-blue-50 bg-white">
              {filteredExecutives.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    {query.trim()
                      ? "No executives match your search."
                      : "No executives found."}
                  </td>
                </tr>
              ) : (
                filteredExecutives.map(({ executiveInfo, summary }) => (
                  <tr
                    key={executiveInfo.id}
                    className="hover:bg-blue-50/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800"
                        >
                          {getInitials(executiveInfo.name)}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {executiveInfo.name}
                          </p>

                          <p className="truncate text-slate-500">
                            {executiveInfo.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      {numberFormatter.format(
                        summary.totalAssignedLeads
                      )}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      {numberFormatter.format(summary.convertedLeads)}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      {numberFormatter.format(summary.pendingFollowUps)}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {formatJoinedDate(executiveInfo.joinedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
