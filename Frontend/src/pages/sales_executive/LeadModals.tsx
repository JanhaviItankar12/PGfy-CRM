import { useEffect, useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { CALL_OUTCOMES, useLogCallMutation, useScheduleFollowUpMutation } from "../../services/excecutiveLeadApi";
import type { CallOutcome } from "../../services/excecutiveLeadApi";
import { FIELD_CLASS, getErrorMessage, humanize, toLocalInputValue } from "./LeadUtils";

/* ---------- Base modal ---------- */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="mb-4 text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Actions({ onClose, saving, submitLabel }: { onClose: () => void; saving: boolean; submitLabel: string }) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-60"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

interface ModalProps {
  leadId: number;
  open: boolean;
  onClose: () => void;
}

/* ---------- Log a call ---------- */

export function LogCallModal({ leadId, open, onClose }: ModalProps) {
  if (!open) return null; // unmounting resets the form each time
  return <LogCallForm leadId={leadId} onClose={onClose} />;
}

function LogCallForm({ leadId, onClose }: Omit<ModalProps, "open">) {
  const [logCall, { isLoading }] = useLogCallMutation();
  const [callDateTime, setCallDateTime] = useState(() => toLocalInputValue(new Date()));
  const [duration, setDuration] = useState("");
  const [outcome, setOutcome] = useState<CallOutcome>("CONNECTED");
  const [notes, setNotes] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await logCall({
        leadId,
        callDateTime: new Date(callDateTime).toISOString(),
        duration: Math.round(Number(duration)),
        outcome,
        notes: notes.trim(),
        ...(nextFollowUpAt ? { nextFollowUpAt: new Date(nextFollowUpAt).toISOString() } : {}),
      }).unwrap();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Modal title="Log new call" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Date and time" htmlFor="call-at">
          <input
            id="call-at"
            type="datetime-local"
            required
            value={callDateTime}
            onChange={(e) => setCallDateTime(e.target.value)}
            className={FIELD_CLASS}
          />
        </Field>
        <Field label="Duration (minutes)" htmlFor="call-duration">
          <input
            id="call-duration"
            type="number"
            required
            min={0}
            step={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={FIELD_CLASS}
          />
        </Field>
        <Field label="Outcome" htmlFor="call-outcome">
          <select
            id="call-outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as CallOutcome)}
            className={FIELD_CLASS}
          >
            {CALL_OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {humanize(o)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes" htmlFor="call-notes">
          <textarea
            id="call-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={FIELD_CLASS}
          />
        </Field>
        <Field
          label="Next follow-up (optional)"
          htmlFor="call-next"
          hint="Creates a follow-up linked to this call."
        >
          <input
            id="call-next"
            type="datetime-local"
            min={toLocalInputValue(new Date())}
            value={nextFollowUpAt}
            onChange={(e) => setNextFollowUpAt(e.target.value)}
            className={FIELD_CLASS}
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <Actions onClose={onClose} saving={isLoading} submitLabel="Save call" />
      </form>
    </Modal>
  );
}

/* ---------- Schedule a follow-up ---------- */

export function ScheduleFollowUpModal({ leadId, open, onClose }: ModalProps) {
  if (!open) return null;
  return <FollowUpForm leadId={leadId} onClose={onClose} />;
}

function FollowUpForm({ leadId, onClose }: Omit<ModalProps, "open">) {
  const [schedule, { isLoading }] = useScheduleFollowUpMutation();
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await schedule({
        leadId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes: notes.trim(),
      }).unwrap();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Modal title="Schedule follow-up" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Date and time" htmlFor="fu-at">
          <input
            id="fu-at"
            type="datetime-local"
            required
            min={toLocalInputValue(new Date())}
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className={FIELD_CLASS}
          />
        </Field>
        <Field label="Notes" htmlFor="fu-notes">
          <textarea
            id="fu-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What should you follow up on?"
            className={FIELD_CLASS}
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <Actions onClose={onClose} saving={isLoading} submitLabel="Schedule" />
      </form>
    </Modal>
  );
}