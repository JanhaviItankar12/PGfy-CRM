import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import type { DateRange } from "./Dashboard";
import { useGetAdminDashboardQuery } from "../../services/adminApi";

function getErrorMessage(err: unknown): string {
  const e = err as { data?: { message?: string }; error?: string } | undefined;
  return e?.data?.message ?? e?.error ?? "Could not load the dashboard.";
}

/** Loads the dashboard numbers and hands them to the Dashboard page. Use this in your routes. */
export default function DashboardContainer() {
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>("30d");
  const { data, isLoading, isFetching, isError, error, refetch } = useGetAdminDashboardQuery(range);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{getErrorMessage(error)}</span>
          <button type="button" onClick={refetch} className="font-medium underline">
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    // While a new range loads, the previous numbers stay visible but dimmed
    <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={isFetching}>
      <Dashboard
        data={data}
        range={range}
        onRangeChange={setRange}
        onAssignLeads={() => navigate("/admin/leads/unassigned")}
      />
    </div>
  );
}