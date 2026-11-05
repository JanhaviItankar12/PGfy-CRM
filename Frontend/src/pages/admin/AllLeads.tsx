
import { useEffect, useId, useMemo, useRef, useState } from "react";

import LeadForm from "./LeadForm";
import type { LeadFormValues } from "./LeadForm";

import {
  useGetLeadsQuery,
  useGetExecutivesQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useAssignLeadsMutation,
} from "../../services/leadApi";

import type {
  Lead,
  Executive,
  LeadStatus,
} from "../../services/leadApi";

/* ---------- Constants ---------- */

const STATUS_ORDER: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "NOT_INTERESTED",
  "FOLLOW_UP",
  "VISIT_SCHEDULED",
  "CONVERTED",
];

const DEFAULT_CATEGORIES = [
  "Single Sharing",
  "Double Sharing",
  "Triple Sharing",
  "Private Room",
  "Studio Apartment",
];

const DEFAULT_SOURCES = [
  "Website",
  "Google Ads",
  "Referral",
  "Social Media",
  "Phone Enquiry",
];

export const STATUS_META: Record<
  LeadStatus,
  { label: string; cls: string }
> = {
  NEW: { label: "New", cls: "bg-blue-50 text-blue-700" },
  CONTACTED: { label: "Contacted", cls: "bg-sky-50 text-sky-700" },
  INTERESTED: { label: "Interested", cls: "bg-indigo-50 text-indigo-700" },
  NOT_INTERESTED: {
    label: "Not interested",
    cls: "bg-slate-100 text-slate-600",
  },
  FOLLOW_UP: { label: "Follow-up", cls: "bg-amber-50 text-amber-700" },
  VISIT_SCHEDULED: {
    label: "Visit scheduled",
    cls: "bg-violet-50 text-violet-700",
  },
  CONVERTED: {
    label: "Converted",
    cls: "bg-emerald-50 text-emerald-700",
  },
};

const PAGE_SIZE = 10;

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fieldClass =
  "rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

/* ---------- Assign Modal ---------- */

function AssignModal({
  leads,
  executives,
  onAssign,
  onClose,
}: {
  leads: Lead[];
  executives: Executive[];
  onAssign: (executiveId: number) => Promise<void>;
  onClose: () => void;
}) {
  const uid = useId();
  const single = leads.length === 1 ? leads[0] : null;

  const alreadyAssigned = leads.filter(
    (lead) => lead.assignedToId !== null
  ).length;

  const isReassign = single
    ? single.assignedToId !== null
    : false;

  const [execId, setExecId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const title = single
    ? isReassign
      ? "Reassign lead"
      : "Assign lead"
    : `Assign ${leads.length} leads`;

  const submit = async () => {
    if (!execId) {
      setError("Choose a sales executive.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await onAssign(Number(execId));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't assign the lead. Try again."
      );

      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        onClick={() => !saving && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl"
      >
        <div className="border-b border-blue-100 px-6 py-4">
          <h2
            id={`${uid}-title`}
            className="text-lg font-semibold text-slate-900"
          >
            {title}
          </h2>

          <p className="text-sm text-slate-500">
            {single
              ? `${single.customerName}, ${single.mobile}`
              : alreadyAssigned > 0
                ? `${alreadyAssigned} of these already have an executive and will be reassigned.`
                : "Pick the executive who will handle these leads."}
          </p>
        </div>

        <div className="space-y-3 px-6 py-5">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          {single && (
            <p className="text-sm text-slate-600">
              Currently assigned to{" "}
              <span className="font-medium text-slate-900">
                {single.assignedTo?.name ?? "nobody"}
              </span>.
            </p>
          )}

          <div>
            <label
              htmlFor={`${uid}-exec`}
              className="mb-1.5 block text-sm font-medium text-slate-800"
            >
              Sales executive
            </label>

            <select
              id={`${uid}-exec`}
              autoFocus
              value={execId}
              onChange={(e) => setExecId(e.target.value)}
              className={`${fieldClass} block w-full`}
            >
              <option value="">Choose executive</option>

              {executives.map((executive) => (
                <option
                  key={executive.id}
                  value={executive.id}
                  disabled={
                    single?.assignedToId === executive.id
                  }
                >
                  {executive.name}
                  {single?.assignedToId === executive.id
                    ? " (current)"
                    : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-blue-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : isReassign ? "Reassign" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- All Leads Page ---------- */

export default function AllLeads() {
  /* ---------- API Queries ---------- */

  const {
    data: leads = [],
    isLoading: leadsLoading,
    isError: leadsError,
    error: leadsErrorData,
  } = useGetLeadsQuery();

  const {
    data: executives = [],
    isLoading: executivesLoading,
    isError: executivesError,
  } = useGetExecutivesQuery();

  /* ---------- Mutations ---------- */

  const [createLead, { isLoading: creatingLead }] =
    useCreateLeadMutation();

  const [updateLead, { isLoading: updatingLead }] =
    useUpdateLeadMutation();

  const [assignLeadsMutation, { isLoading: assigningLeads }] =
    useAssignLeadsMutation();

  /* ---------- UI State ---------- */

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [assignee, setAssignee] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [assignIds, setAssignIds] = useState<number[] | null>(null);

  const execById = useMemo(
    () => new Map(executives.map((e) => [e.id, e])),
    [executives]
  );

  /* ---------- Filtering ---------- */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return [...leads]
      .sort(
        (a, b) =>
          new Date(b.enquiryDate).getTime() -
          new Date(a.enquiryDate).getTime()
      )
      .filter((lead) => {
        if (status !== "all" && lead.status !== status) {
          return false;
        }

        if (
          assignee === "unassigned" &&
          lead.assignedToId !== null
        ) {
          return false;
        }

        if (
          assignee !== "all" &&
          assignee !== "unassigned" &&
          String(lead.assignedToId) !== assignee
        ) {
          return false;
        }

        if (
          q &&
          !`${lead.customerName} ${lead.mobile} ${
            lead.email ?? ""
          } ${lead.preferredLocation} ${lead.id}`
            .toLowerCase()
            .includes(q)
        ) {
          return false;
        }

        return true;
      });
  }, [leads, query, status, assignee]);

  /* ---------- Pagination ---------- */

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, pageCount);

  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const allOnPageSelected =
    pageRows.length > 0 &&
    pageRows.every((lead) => selected.has(lead.id));

  const someOnPageSelected = pageRows.some(
    (lead) => selected.has(lead.id)
  );

  const headerCheckbox = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (headerCheckbox.current) {
      headerCheckbox.current.indeterminate =
        someOnPageSelected && !allOnPageSelected;
    }
  }, [someOnPageSelected, allOnPageSelected]);

  const changeFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
      setSelected(new Set());
    };

  /* ---------- Selection ---------- */

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);

      if (allOnPageSelected) {
        pageRows.forEach((lead) => next.delete(lead.id));
      } else {
        pageRows.forEach((lead) => next.add(lead.id));
      }

      return next;
    });
  };

  /* ---------- Form ---------- */

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSave = async (values: LeadFormValues) => {
    try {
      if (editing) {
        await updateLead({
          id: editing.id,
          data: values,
        }).unwrap();

        setNotice(`Updated ${values.customerName} successfully.`);
      } else {
        await createLead(values).unwrap();

        setNotice(`Added ${values.customerName} successfully.`);
      }

      closeForm();
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "message" in error.data
          ? String(error.data.message)
          : "Something went wrong. Please try again.";

      throw new Error(message);
    }
  };

  /* ---------- Assignment ---------- */

  const handleAssign = async (executiveId: number) => {
    if (!assignIds?.length) return;

    const exec = execById.get(executiveId);

    if (!exec) {
      throw new Error("Sales executive not found.");
    }

    try {
      const alreadyAssigned = leads.some(
        (lead) =>
          assignIds.includes(lead.id) &&
          lead.assignedToId !== null
      );

      await assignLeadsMutation({
        leadIds: assignIds,
        executiveId,
      }).unwrap();

      setNotice(
        `${alreadyAssigned ? "Reassigned" : "Assigned"} ${
          assignIds.length
        } lead(s) to ${exec.name}.`
      );

      setSelected(new Set());
      setAssignIds(null);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "message" in error.data
          ? String(error.data.message)
          : "Failed to assign leads.";

      throw new Error(message);
    }
  };

  /* ---------- Derived Data ---------- */

  const unassignedCount = leads.filter(
    (lead) => lead.assignedToId === null
  ).length;

  const assignLeads = assignIds
    ? leads.filter((lead) => assignIds.includes(lead.id))
    : [];

  /* ---------- Loading and Error States ---------- */

  if (leadsLoading || executivesLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-slate-600">
        Loading leads...
      </div>
    );
  }

  if (leadsError || executivesError) {
    return (
      <div role="alert" className="p-6 text-red-600">
        Failed to load leads or executives.{" "}
        {JSON.stringify(leadsErrorData)}
      </div>
    );
  }

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">

        {/* Heading */}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              All leads
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              {leads.length} leads in total, {unassignedCount} waiting to be assigned.
            </p>
          </div>

          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add lead
          </button>
        </div>

        {/* Search and Filters */}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1 sm:max-w-xs">
            <label htmlFor="lead-search" className="sr-only">
              Search leads
            </label>

            <input
              id="lead-search"
              type="search"
              placeholder="Search name, mobile, email or area"
              value={query}
              onChange={(e) =>
                changeFilter(setQuery)(e.target.value)
              }
              className={`${fieldClass} w-full`}
            />
          </div>

          <select
            id="f-status"
            value={status}
            onChange={(e) =>
              changeFilter(setStatus)(
                e.target.value as LeadStatus | "all"
              )
            }
            className={fieldClass}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>

            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>

          <select
            id="f-assignee"
            value={assignee}
            onChange={(e) =>
              changeFilter(setAssignee)(e.target.value)
            }
            className={fieldClass}
            aria-label="Filter by executive"
          >
            <option value="all">All executives</option>
            <option value="unassigned">Unassigned</option>

            {executives.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bulk Actions */}

        {selected.size > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-sm font-medium text-blue-900">
              {selected.size} selected
            </p>

            <button
              type="button"
              onClick={() =>
                setAssignIds(Array.from(selected))
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Assign to executive
            </button>

            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        <p role="status" className="mt-3 min-h-5 text-sm text-blue-800">
          {notice}
        </p>

        {/* Leads Table */}

        <div className="mt-1 overflow-hidden rounded-xl border border-blue-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-blue-50 text-blue-900">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      ref={headerCheckbox}
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                      aria-label="Select all leads on this page"
                      className="h-4 w-4"
                    />
                  </th>

                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Looking for</th>
                  <th className="px-4 py-3 text-right">Budget</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned executive</th>
                  <th className="px-4 py-3">Enquiry date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-blue-50 bg-white">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      No leads match these filters.
                    </td>
                  </tr>
                )}

                {pageRows.map((lead) => (
                  <tr
                    key={lead.id}
                    className={
                      selected.has(lead.id)
                        ? "bg-blue-50/60"
                        : "hover:bg-blue-50/40"
                    }
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleOne(lead.id)}
                        aria-label={`Select ${lead.customerName}`}
                        className="h-4 w-4"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {lead.customerName}
                      </p>

                      <a
                        href={`tel:${lead.mobile}`}
                        className="text-slate-500 hover:text-blue-700"
                      >
                        {lead.mobile}
                      </a>

                      {lead.email && (
                        <p className="text-slate-400">
                          {lead.email}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {lead.propertyCategory}
                      </p>
                      <p className="text-slate-500">
                        {lead.preferredLocation}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {inr.format(lead.budget)}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {lead.leadSource}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_META[lead.status].cls
                        }`}
                      >
                        {STATUS_META[lead.status].label}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {lead.assignedTo ? (
                        <span className="font-medium text-slate-800">
                          {lead.assignedTo.name}
                        </span>
                      ) : (
                        <span className="rounded-full border border-dashed border-blue-300 px-2.5 py-0.5 text-xs text-blue-700">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {shortDate(lead.enquiryDate)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setAssignIds([lead.id])}
                        className="rounded-lg px-3 py-1.5 text-blue-700 hover:bg-blue-50"
                      >
                        {lead.assignedTo ? "Reassign" : "Assign"}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEdit(lead)}
                        className="rounded-lg px-3 py-1.5 text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 bg-white px-4 py-3 text-sm text-slate-600">
            <p>
              {filtered.length === 0
                ? "0 leads"
                : `Showing ${(currentPage - 1) * PAGE_SIZE + 1} to ${Math.min(
                    currentPage * PAGE_SIZE,
                    filtered.length
                  )} of ${filtered.length}`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-lg border border-blue-200 px-3 py-1.5 disabled:opacity-50"
              >
                Previous
              </button>

              <span>
                Page {currentPage} of {pageCount}
              </span>

              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount}
                className="rounded-lg border border-blue-200 px-3 py-1.5 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Create / Edit Modal */}

      {formOpen && (
        <LeadForm
          lead={editing}
          executives={executives}
          statusOptions={STATUS_ORDER.map((value) => ({
            value,
            label: STATUS_META[value].label,
          }))}
          categoryOptions={DEFAULT_CATEGORIES}
          sourceOptions={DEFAULT_SOURCES}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}

      {/* Assignment Modal */}

      {assignIds && assignLeads.length > 0 && (
        <AssignModal
          leads={assignLeads}
          executives={executives}
          onAssign={handleAssign}
          onClose={() => setAssignIds(null)}
        />
      )}
    </>
  );
}
