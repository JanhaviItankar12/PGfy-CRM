import type { LeadStatus } from "../../services/leadApi";
import type { FollowUp } from "../../services/excecutiveLeadApi";

/* ---------- Formatting ---------- */

/** "CALL_BACK_REQUESTED" -> "Call Back Requested" */
export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatBudget(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "Nov 5" (adds the year when it isn't the current year) */
export function formatDate(iso: string | null | undefined, fallback = "—"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "Nov 5, 4:30 PM" */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

/** Value for <input type="datetime-local"> in the user's local time */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Turns an RTK Query error into a readable message */
export function getErrorMessage(err: unknown): string {
  const e = err as { data?: { message?: string }; error?: string } | undefined;
  return e?.data?.message ?? e?.error ?? "Something went wrong. Please try again.";
}

/* ---------- UI ---------- */

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-slate-100 text-slate-700",
  INTERESTED: "bg-amber-50 text-amber-700",
  FOLLOW_UP: "bg-indigo-50 text-indigo-700",
  VISIT_SCHEDULED: "bg-sky-50 text-sky-700",
  CONVERTED: "bg-emerald-50 text-emerald-700",
  NOT_INTERESTED: "bg-red-50 text-red-700",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {humanize(status)}
    </span>
  );
}

/** A pending follow-up whose time has passed is shown as Overdue */
export function followUpDisplay(f: FollowUp): { label: string; className: string } {
  if (f.status === "PENDING" && new Date(f.scheduledAt).getTime() < Date.now()) {
    return { label: "Overdue", className: "bg-red-50 text-red-700" };
  }
  if (f.status === "COMPLETED") return { label: "Completed", className: "bg-emerald-50 text-emerald-700" };
  if (f.status === "CANCELLED") return { label: "Cancelled", className: "bg-slate-100 text-slate-600" };
  return { label: "Pending", className: "bg-amber-50 text-amber-700" };
}

export const FIELD_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";