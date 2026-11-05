import { baseApi } from "./baseApi";
import type { Lead, LeadStatus } from "./leadApi";

/* ---------- Types (match the Prisma enums and models) ---------- */

export type CallOutcome =
  | "CONNECTED"
  | "NOT_ANSWERED"
  | "BUSY"
  | "SWITCHED_OFF"
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "CALL_BACK_REQUESTED"
  | "VISIT_SCHEDULED"
  | "CONVERTED";

export type FollowUpStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export const LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
  "VISIT_SCHEDULED",
  "CONVERTED",
  "NOT_INTERESTED",
];

export const CALL_OUTCOMES: CallOutcome[] = [
  "CONNECTED",
  "NOT_ANSWERED",
  "BUSY",
  "SWITCHED_OFF",
  "INTERESTED",
  "NOT_INTERESTED",
  "CALL_BACK_REQUESTED",
  "VISIT_SCHEDULED",
  "CONVERTED",
];

/** Lead plus the date of its most recent call (null = never called) */
export interface ExecutiveLead extends Lead {
  lastCallAt: string | null;
}

export interface CallRecord {
  id: number;
  leadId: number;
  executiveId: number;
  callDateTime: string;
  duration: number; // minutes
  outcome: CallOutcome;
  notes: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
}

/** A call together with the customer it was made to (for the Call History page) */
export interface ExecutiveCall extends CallRecord {
  lead: { id: number; customerName: string; mobile: string };
}

export interface FollowUp {
  id: number;
  leadId: number;
  executiveId: number;
  callId: number | null;
  scheduledAt: string;
  status: FollowUpStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A follow-up together with the customer it belongs to (for the Follow-ups page) */
export interface ExecutiveFollowUp extends FollowUp {
  lead: { id: number; customerName: string; mobile: string };
}

export interface GetMyLeadsArgs {
  search: string;
  status: LeadStatus | "";
}

export interface LogCallArgs {
  leadId: number;
  callDateTime: string;
  duration: number;
  outcome: CallOutcome;
  notes: string;
  nextFollowUpAt?: string;
}

export interface ScheduleFollowUpArgs {
  leadId: number;
  scheduledAt: string;
  notes: string;
}

/* ---------- Endpoints ---------- */

export const executiveLeadApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Leads assigned to the logged-in executive. Backend includes the latest call (see notes). */
    getMyLeads: builder.query<ExecutiveLead[], GetMyLeadsArgs>({
      query: ({ search, status }) => ({
        url: "/executive/leads",
        params: {
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
        },
      }),
      transformResponse: (response: { data: (Lead & { calls?: { callDateTime: string }[] })[] }) =>
        response.data.map(({ calls, ...lead }) => ({
          ...lead,
          lastCallAt: calls?.[0]?.callDateTime ?? null,
        })),
      providesTags: ["Leads"],
    }),

    getMyLead: builder.query<Lead, number>({
      query: (id) => `/executive/leads/${id}`,
      transformResponse: (response: { data: Lead }) => response.data,
      providesTags: (_res, _err, id) => [{ type: "Leads", id }],
    }),

    updateMyLeadStatus: builder.mutation<Lead, { id: number; status: LeadStatus }>({
      query: ({ id, status }) => ({
        url: `/executive/leads/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (response: { data: Lead }) => response.data,
      invalidatesTags: ["Leads"],
    }),

    getLeadCalls: builder.query<CallRecord[], number>({
      query: (leadId) => `/executive/leads/${leadId}/calls`,
      transformResponse: (response: { data: CallRecord[] }) => response.data,
      providesTags: (_res, _err, leadId) => [{ type: "Calls", id: leadId }],
    }),

    /** Every call made by the logged-in executive, each with its lead's name and mobile */
    getMyCalls: builder.query<ExecutiveCall[], void>({
      query: () => "/executive/calls",
      transformResponse: (response: { data: ExecutiveCall[] }) => response.data,
      providesTags: [{ type: "Calls", id: "LIST" }],
    }),

    /** Also refreshes leads (Last Call) and follow-ups (a call can create one via nextFollowUpAt) */
    logCall: builder.mutation<CallRecord, LogCallArgs>({
      query: ({ leadId, ...body }) => ({
        url: `/executive/leads/${leadId}/calls`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: CallRecord }) => response.data,
      invalidatesTags: (_res, _err, { leadId }) => [
        { type: "Calls", id: leadId },
        { type: "Calls", id: "LIST" },
        { type: "FollowUps", id: leadId },
        { type: "FollowUps", id: "LIST" },
        "Leads",
      ],
    }),

    getLeadFollowUps: builder.query<FollowUp[], number>({
      query: (leadId) => `/executive/leads/${leadId}/follow-ups`,
      transformResponse: (response: { data: FollowUp[] }) => response.data,
      providesTags: (_res, _err, leadId) => [{ type: "FollowUps", id: leadId }],
    }),

    scheduleFollowUp: builder.mutation<FollowUp, ScheduleFollowUpArgs>({
      query: ({ leadId, ...body }) => ({
        url: `/executive/leads/${leadId}/follow-ups`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: FollowUp }) => response.data,
      invalidatesTags: (_res, _err, { leadId }) => [
        { type: "FollowUps", id: leadId },
        { type: "FollowUps", id: "LIST" },
      ],
    }),

    /** All follow-ups of the logged-in executive, each with its lead's name and mobile */
    getMyFollowUps: builder.query<ExecutiveFollowUp[], void>({
      query: () => "/executive/follow-ups",
      transformResponse: (response: { data: ExecutiveFollowUp[] }) => response.data,
      providesTags: [{ type: "FollowUps", id: "LIST" }],
    }),

    /** Mark a follow-up COMPLETED or CANCELLED */
    updateFollowUpStatus: builder.mutation<FollowUp, { id: number; status: FollowUpStatus }>({
      query: ({ id, status }) => ({
        url: `/executive/follow-ups/${id}`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (response: { data: FollowUp }) => response.data,
      invalidatesTags: ["FollowUps"],
    }),
  }),
});

export const {
  useGetMyLeadsQuery,
  useGetMyLeadQuery,
  useUpdateMyLeadStatusMutation,
  useGetLeadCallsQuery,
  useLogCallMutation,
  useGetLeadFollowUpsQuery,
  useScheduleFollowUpMutation,
  useGetMyFollowUpsQuery,
  useUpdateFollowUpStatusMutation,
  useGetMyCallsQuery,
} = executiveLeadApi;