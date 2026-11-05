import FollowUps from "./FollowUps";
import { useGetAllFollowUpsQuery } from "../../services/adminApi";

function getErrorMessage(err: unknown): string {
  const e = err as { data?: { message?: string }; error?: string } | undefined;
  return e?.data?.message ?? e?.error ?? "Something went wrong. Please try again.";
}

/** Loads follow-ups from the API and hands them to the FollowUps page. Use this in your routes. */
export default function FollowUpsContainer() {
  // Admins only monitor, so keep the list fresh while the page is open
  const { data, isLoading, isError, error, refetch } = useGetAllFollowUpsQuery(undefined, {
    pollingInterval: 60_000,
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-slate-100" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
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

  return <FollowUps followUps={data} />;
}