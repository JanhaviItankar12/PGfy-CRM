import { baseApi } from "./baseApi";
import type { LeadFormValues } from "../pages/admin/LeadForm";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "FOLLOW_UP"
  | "VISIT_SCHEDULED"
  | "CONVERTED";

export interface Executive {
  id: number;
  name: string;
}

export interface Lead {
  id: number;
  customerName: string;
  mobile: string;
  email: string | null;
  propertyCategory: string;
  preferredLocation: string;
  budget: number;
  leadSource: string;
  status: LeadStatus;
  enquiryDate: string;
  assignedToId: number | null;
  assignedTo: Executive | null;
  createdAt: string;
  updatedAt: string;
}

interface AssignLeadsPayload {
  leadIds: number[];
  executiveId: number;
}

export interface ExecutiveFullData {
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

export interface DashboardFollowUp {
  id: number;
  scheduledAt: string;
  notes: string | null;
  lead: {
    id: number;
    customerName: string;
    mobile: string;
  };
}

export interface RecentLead {
  id: number;
  customerName: string;
  mobile: string;
  propertyCategory: string;
  preferredLocation: string;
  budget: number;
  leadSource: string;
  status: LeadStatus;
  enquiryDate: string;
  updatedAt: string;
  callCount: number;
}

export interface ExecutiveDashboardData {
  executiveInfo: {
    id: number;
    name: string;
    email: string;
  };

  summary: {
    assignedLeads: number;
    leadsContacted: number;
    totalCalls: number;
    pendingFollowUps: number;
    overdueFollowUps: number;
    convertedLeads: number;
  };

  performance: {
    callCoverageRate: number;
    conversionRate: number;
    connectionRate: number;
    connectedCalls: number;
  };

  followUps: {
    today: { total: number; items: DashboardFollowUp[] };
    overdue: { total: number; items: DashboardFollowUp[] };
  };

  recentLeads: RecentLead[];
}

export const leadApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
   
    getLeads: builder.query<Lead[], void>({
  query: () => "/leads",
  transformResponse: (response: { data: Lead[] }) => response.data,
  providesTags: ["Leads"],
}),

getExecutives: builder.query<Executive[], void>({
  query: () => "/admin/executives",
  transformResponse: (response: { data: Executive[] }) => response.data,
  providesTags: ["Executives"],
}),

getExecutiveFullData: builder.query<ExecutiveFullData[], void>({
  query: () => "/admin/executives/full-data",

  transformResponse: (
    response: { data: ExecutiveFullData[] }
  ) => response.data,

  providesTags: ["Executives"],
}),

getExecutiveSummaryDataById: builder.query<ExecutiveDashboardData, number>({
  query: (id) => `/executive/${id}/dashboard`,

  transformResponse: (
    response: { data: ExecutiveDashboardData }
  ) => response.data,

  providesTags: ["Executives"],
}),

createLead: builder.mutation<Lead, LeadFormValues>({
  query: (body) => ({
    url: "/leads",
    method: "POST",
    body,
  }),
  transformResponse: (response: { data: Lead }) => response.data,
  invalidatesTags: ["Leads"],
}),

updateLead: builder.mutation<Lead, { id: number; data: LeadFormValues }>({
  query: ({ id, data }) => ({
    url: `/leads/${id}`,
    method: "PUT",
    body: data,
  }),
  transformResponse: (response: { data: Lead }) => response.data,
  invalidatesTags: ["Leads"],
}),

assignLeads: builder.mutation<void, AssignLeadsPayload>({
  query: (body) => ({
    url: "/leads/assign",
    method: "PATCH",
    body,
  }),
  invalidatesTags: ["Leads"],
}),
  }),

  //get excecutive full data
});

export const {
  useGetLeadsQuery,
  useGetExecutivesQuery,
  useGetExecutiveFullDataQuery,
  useGetExecutiveSummaryDataByIdQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useAssignLeadsMutation,
} = leadApi;