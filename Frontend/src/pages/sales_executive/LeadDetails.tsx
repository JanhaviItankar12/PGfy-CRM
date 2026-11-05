import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LEAD_STATUSES,
  useGetLeadCallsQuery,
  useGetLeadFollowUpsQuery,
  useGetMyLeadQuery,
  useUpdateMyLeadStatusMutation,
} from "../../services/excecutiveLeadApi";
import type { LeadStatus } from "../../services/leadApi";
import { LogCallModal, ScheduleFollowUpModal } from "./LeadModals";
import {
  FIELD_CLASS,
  followUpDisplay,
  formatBudget,
  formatDate,
  formatDateTime,
  formatDuration,
  getErrorMessage,
  humanize,
} from "./LeadUtils";

/* ---------- Small pieces ---------- */

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border border-blue-100 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-blue-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-blue-200 px-3.5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    >
      {children}
    </button>
  );
}

/* ---------- Page ---------- */

export default function LeadDetails() {
  const { id } = useParams<{ id: string }>();
  const leadId = Number(id);
  const validId = Number.isInteger(leadId) && leadId > 0;

  const { data: lead, isLoading, isError, error, refetch } = useGetMyLeadQuery(leadId, { skip: !validId });
  const calls = useGetLeadCallsQuery(leadId, { skip: !validId });
  const followUps = useGetLeadFollowUpsQuery(leadId, { skip: !validId });

  const [updateStatus, { isLoading: savingStatus }] = useUpdateMyLeadStatusMutation();
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [callOpen, setCallOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  const handleStatusChange = async (status: LeadStatus) => {
    setStatusError(null);
    setPendingStatus(status);
    try {
      await updateStatus({ id: leadId, status }).unwrap();
    } catch (err) {
      setStatusError(getErrorMessage(err));
    } finally {
      setPendingStatus(null);
    }
  };

  const backLink = (
    <Link to="/executive/leads" className="text-sm font-medium text-blue-700 hover:underline">
      ← Back to My Leads
    </Link>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8" aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 h-56 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (!validId || isError || !lead) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        {backLink}
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {isError ? getErrorMessage(error) : "This lead could not be found."}{" "}
          {validId && (
            <button type="button" onClick={refetch} className="font-medium underline">
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      {backLink}

      <header className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{lead.customerName}</h1>
        <div className="flex gap-2">
          <PrimaryButton onClick={() => setCallOpen(true)}>+ Log New Call</PrimaryButton>
          <SecondaryButton onClick={() => setFollowUpOpen(true)}>Schedule follow-up</SecondaryButton>
        </div>
      </header>

      {/* A. Customer information */}
      <Section title="Customer information">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Customer name">{lead.customerName}</Info>
          <Info label="Mobile number">
            <a href={`tel:${lead.mobile}`} className="text-blue-700 hover:underline">
              {lead.mobile}
            </a>
          </Info>
          <Info label="Email">
            {lead.email ? (
              <a href={`mailto:${lead.email}`} className="break-all text-blue-700 hover:underline">
                {lead.email}
              </a>
            ) : (
              "—"
            )}
          </Info>
          <Info label="Property category">{lead.propertyCategory}</Info>
          <Info label="Preferred location">{lead.preferredLocation}</Info>
          <Info label="Budget">{formatBudget(lead.budget)}</Info>
          <Info label="Lead source">{lead.leadSource}</Info>
          <div>
            <dt className="text-sm text-slate-500">
              <label htmlFor="lead-status">Current status</label>
            </dt>
            <dd className="mt-0.5">
              <select
                id="lead-status"
                value={pendingStatus ?? lead.status}
                disabled={savingStatus}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                className={`${FIELD_CLASS} max-w-[220px]`}
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </select>
              {statusError && (
                <p role="alert" className="mt-1 text-sm text-red-700">
                  {statusError}
                </p>
              )}
            </dd>
          </div>
        </dl>
      </Section>

      {/* B. Call history */}
      <Section title="Call history" action={<PrimaryButton onClick={() => setCallOpen(true)}>+ Log New Call</PrimaryButton>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-blue-100 bg-blue-50/50 text-slate-600">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Date</th>
                <th scope="col" className="px-5 py-3 font-medium">Duration</th>
                <th scope="col" className="px-5 py-3 font-medium">Outcome</th>
                <th scope="col" className="px-5 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {calls.isLoading && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-500">
                    Loading calls…
                  </td>
                </tr>
              )}
              {calls.isError && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-red-700">
                    {getErrorMessage(calls.error)}
                  </td>
                </tr>
              )}
              {calls.data?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    No calls recorded yet. Use “+ Log New Call” after you speak to this customer.
                  </td>
                </tr>
              )}
              {calls.data?.map((call) => (
                <tr key={call.id}>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-900">{formatDate(call.callDateTime)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-700">{formatDuration(call.duration)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-700">{humanize(call.outcome)}</td>
                  <td className="px-5 py-3 text-slate-700">{call.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* C. Follow-ups */}
      <Section title="Follow-ups" action={<SecondaryButton onClick={() => setFollowUpOpen(true)}>+ Schedule follow-up</SecondaryButton>}>
        {followUps.isLoading && <p className="px-5 py-6 text-center text-sm text-slate-500">Loading follow-ups…</p>}
        {followUps.isError && (
          <p className="px-5 py-6 text-center text-sm text-red-700">{getErrorMessage(followUps.error)}</p>
        )}
        {followUps.data?.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No follow-ups scheduled.</p>
        )}
        <ul className="divide-y divide-blue-50">
          {followUps.data?.map((f) => {
            const badge = followUpDisplay(f);
            return (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{formatDateTime(f.scheduledAt)}</p>
                  <p className="text-slate-600">{f.notes || "No notes"}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      <LogCallModal leadId={leadId} open={callOpen} onClose={() => setCallOpen(false)} />
      <ScheduleFollowUpModal leadId={leadId} open={followUpOpen} onClose={() => setFollowUpOpen(false)} />
    </div>
  );
}