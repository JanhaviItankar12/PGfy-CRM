import { baseApi } from "./baseApi";
import type { CallRecord } from "../pages/admin/CallHistory";
import type { FollowUp } from "../pages/admin/FollowUps";

import type { DashboardData, DateRange, ExecutiveStats } from "../pages/admin/Dashboard";

import type { PerformanceReport, ReportRange } from "../pages/admin/Reports";

/**
 * What GET /follow-ups returns. Your Prisma Lead model uses customerName and mobile,
 * while the FollowUps page expects lead.name and lead.phone, so we rename them below.
 */
interface ApiFollowUp extends Omit<FollowUp, "lead"> {
  lead: { id: number; customerName: string; mobile: string };


  
}

interface ApiDashboard extends Omit<DashboardData, "executives"> {
  executives: (Omit<ExecutiveStats, "id"> & { id: number })[];
}
 

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Dashboard numbers for the whole team (Admin). The range only affects call counts.
    getAdminDashboard: builder.query<DashboardData, DateRange>({
      query: (range) => ({ url: "/admin/dashboard", params: { range } }),
      transformResponse: (response: { data: ApiDashboard }) => ({
        ...response.data,
        executives: response.data.executives.map((e) => ({ ...e, id: String(e.id) })),
      }),
      // Refreshes when leads are assigned, or calls and follow-ups change
      providesTags: ["Leads", { type: "Calls", id: "LIST" }, { type: "FollowUps", id: "LIST" }],
    }),
 
    // Get all calls (Admin)
    getAllCalls: builder.query<CallRecord[], void>({
      query: () => "/admin/calls",
      transformResponse: (response: { data: CallRecord[] }) => response.data,
      // Same tag the executive pages use, so a newly logged call refreshes this list too
      providesTags: [{ type: "Calls", id: "LIST" }],
    }),
 
    // Get all follow-ups (Admin, view only)
    getAllFollowUps: builder.query<FollowUp[], void>({
      query: () => "/admin/follow-ups",
      transformResponse: (response: { data: ApiFollowUp[] }) =>
        response.data.map(({ lead, ...followUp }) => ({
          ...followUp,
          lead: { id: lead.id, name: lead.customerName, phone: lead.mobile },
        })),
      providesTags: [{ type: "FollowUps", id: "LIST" }],
    }),


    getExecutivePerformanceReport: builder.query<PerformanceReport, ReportRange>({
      query: (range) => ({ url: "/admin/reports/executive-performance", params: { range } }),
      transformResponse: (response: { data: PerformanceReport }) => response.data,
      providesTags: ["Leads", { type: "Calls", id: "LIST" }],
    }),
  }),
});

export const { useGetAllCallsQuery, useGetAllFollowUpsQuery, useGetAdminDashboardQuery ,useGetExecutivePerformanceReportQuery} = adminApi;