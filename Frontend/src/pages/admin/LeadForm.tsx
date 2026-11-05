import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Executive, Lead, LeadStatus } from "./AllLeads";

/* ---------- Types ---------- */

/** The fields sent to your backend. They match the Prisma Lead model. */
export interface LeadFormValues {
  customerName: string;
  mobile: string;
  email: string | null;
  propertyCategory: string;
  preferredLocation: string;
  budget: number;
  leadSource: string;
  status: LeadStatus;
  /** ISO date string */
  enquiryDate: string;
  assignedToId: number | null;
}

interface LeadFormProps {
  /** Pass a lead to edit it, or null to add a new one. */
  lead: Lead | null;
  executives: Executive[];
  statusOptions: { value: LeadStatus; label: string }[];
  categoryOptions: string[];
  sourceOptions: string[];
  /** Throw an Error with a readable message to show it in the form. */
  onSave: (values: LeadFormValues) => Promise<void>;
  onClose: () => void;
}

type Errors = Partial<
  Record<"customerName" | "mobile" | "email" | "preferredLocation" | "budget" | "enquiryDate", string>
>;

/* ---------- Helpers ---------- */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toInputDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Make sure a saved value that isn't in the list (older data) still shows up as an option. */
function withCurrent(options: string[], current?: string): string[] {
  return current && !options.includes(current) ? [current, ...options] : options;
}

const inputClass = (hasError: boolean) =>
  `block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 ${
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-blue-200 focus:border-blue-600 focus:ring-blue-200"
  }`;

function Field({
  id,
  label,
  error,
  hint,
  children,
  className = "",
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>
      )}
    </div>
  );
}

/* ---------- Component ---------- */

export default function LeadForm({
  lead,
  executives,
  statusOptions,
  categoryOptions,
  sourceOptions,
  onSave,
  onClose,
}: LeadFormProps) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const isEdit = lead !== null;

  const categories = withCurrent(categoryOptions, lead?.propertyCategory);
  const sources = withCurrent(sourceOptions, lead?.leadSource);

  const [customerName, setCustomerName] = useState(lead?.customerName ?? "");
  const [mobile, setMobile] = useState(lead?.mobile ?? "");
  const [email, setEmail] = useState(lead?.email ?? "");
  const [propertyCategory, setPropertyCategory] = useState(lead?.propertyCategory ?? categories[0] ?? "");
  const [preferredLocation, setPreferredLocation] = useState(lead?.preferredLocation ?? "");
  const [budget, setBudget] = useState(lead ? String(lead.budget) : "");
  const [leadSource, setLeadSource] = useState(lead?.leadSource ?? sources[0] ?? "");
  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? statusOptions[0].value);
  const [assignedToId, setAssignedToId] = useState(lead?.assignedToId != null ? String(lead.assignedToId) : "");
  const [enquiryDate, setEnquiryDate] = useState(toInputDate(lead?.enquiryDate ?? new Date().toISOString()));

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const firstField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    firstField.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const buildEnquiryIso = (): string => {
    // Keep the original timestamp if the date wasn't changed
    if (lead && enquiryDate === toInputDate(lead.enquiryDate)) return lead.enquiryDate;
    // A new lead enquired today gets the current time
    if (!lead && enquiryDate === toInputDate(new Date().toISOString())) return new Date().toISOString();
    return new Date(`${enquiryDate}T00:00:00`).toISOString();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    const next: Errors = {};
    if (!customerName.trim()) next.customerName = "Enter the customer's name.";
    if (!/^[6-9]\d{9}$/.test(mobile)) next.mobile = "Enter a valid 10-digit mobile number.";
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) next.email = "Enter a valid email address.";
    if (!preferredLocation.trim()) next.preferredLocation = "Enter the preferred area or city.";
    if (!budget || Number(budget) <= 0) next.budget = "Enter a budget above 0.";
    if (!enquiryDate) next.enquiryDate = "Choose the enquiry date.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await onSave({
        customerName: customerName.trim(),
        mobile,
        email: email.trim() || null,
        propertyCategory,
        preferredLocation: preferredLocation.trim(),
        budget: Number(budget),
        leadSource,
        status,
        enquiryDate: buildEnquiryIso(),
        assignedToId: assignedToId ? Number(assignedToId) : null,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't save the lead. Try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      <div className="absolute inset-0" onClick={() => !saving && onClose()} aria-hidden="true" />

      <div role="dialog" aria-modal="true" aria-labelledby={id("title")} className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-blue-100 px-6 py-4">
          <div>
            <h2 id={id("title")} className="text-lg font-semibold text-slate-900">
              {isEdit ? "Edit lead" : "Add lead"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEdit ? `Lead #${lead.id}` : "Enter the details of the new lead."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            {formError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 sm:col-span-2">
                {formError}
              </div>
            )}

            <Field id={id("name")} label="Customer name" error={errors.customerName}>
              <input
                ref={firstField}
                id={id("name")}
                type="text"
                autoComplete="off"
                placeholder="Full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                aria-invalid={!!errors.customerName}
                className={inputClass(!!errors.customerName)}
              />
            </Field>

            <Field id={id("mobile")} label="Mobile number" error={errors.mobile}>
              <input
                id={id("mobile")}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoComplete="off"
                placeholder="10-digit number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                aria-invalid={!!errors.mobile}
                className={inputClass(!!errors.mobile)}
              />
            </Field>

            <Field id={id("email")} label="Email (optional)" error={errors.email}>
              <input
                id={id("email")}
                type="email"
                autoComplete="off"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                className={inputClass(!!errors.email)}
              />
            </Field>

            <Field id={id("category")} label="Property category">
              <select id={id("category")} value={propertyCategory} onChange={(e) => setPropertyCategory(e.target.value)} className={inputClass(false)}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field id={id("location")} label="Preferred location" error={errors.preferredLocation}>
              <input
                id={id("location")}
                type="text"
                autoComplete="off"
                placeholder="e.g. Kothrud, Pune"
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                aria-invalid={!!errors.preferredLocation}
                className={inputClass(!!errors.preferredLocation)}
              />
            </Field>

            <Field id={id("budget")} label="Budget (₹ per month)" error={errors.budget}>
              <input
                id={id("budget")}
                type="number"
                inputMode="numeric"
                min={0}
                step={500}
                placeholder="e.g. 8000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                aria-invalid={!!errors.budget}
                className={inputClass(!!errors.budget)}
              />
            </Field>

            <Field id={id("source")} label="Lead source">
              <select id={id("source")} value={leadSource} onChange={(e) => setLeadSource(e.target.value)} className={inputClass(false)}>
                {sources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field id={id("status")} label="Lead status">
              <select id={id("status")} value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className={inputClass(false)}>
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>

            <Field id={id("assigned")} label="Assigned executive" hint="You can change this later with Reassign.">
              <select id={id("assigned")} value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className={inputClass(false)}>
                <option value="">Unassigned</option>
                {executives.map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
            </Field>

            <Field id={id("enquiry")} label="Enquiry date" error={errors.enquiryDate}>
              <input
                id={id("enquiry")}
                type="date"
                value={enquiryDate}
                max={toInputDate(new Date().toISOString())}
                onChange={(e) => setEnquiryDate(e.target.value)}
                aria-invalid={!!errors.enquiryDate}
                className={inputClass(!!errors.enquiryDate)}
              />
            </Field>
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
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : isEdit ? "Save changes" : "Add lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}