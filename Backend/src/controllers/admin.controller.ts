import { Request, Response } from "express";
import prisma from "../config/prisma";
import { CallOutcome, FollowUpStatus, Prisma } from "../generated/prisma/client";

import { CONNECTED_OUTCOMES ,  percentage } from "../utils/SalesMetrices";

export const getExecutives = async (req: Request, res: Response) => {
  try {
    const executives = await prisma.user.findMany({
      where: {
        role: "SALES_EXECUTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("Fetched Executives:", executives); // Debugging line

    return res.status(200).json({
      success: true,
      message: "Sales executives fetched successfully",
      count: executives.length,
      data: executives,
    });
  } catch (error) {
    console.error("Get Executives Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales executives",
    });
  }
};



export const getExecutiveFullData = async (
  req: Request,
  res: Response
) => {
  try {
    const executives = await prisma.user.findMany({
      where: {
        role: "SALES_EXECUTIVE",
      },

      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,

        assignedLeads: {
          select: {
            id: true,
            customerName: true,
            mobile: true,
            email: true,
            propertyCategory: true,
            preferredLocation: true,
            budget: true,
            leadSource: true,
            status: true,
            enquiryDate: true,

            followUps: {
              where: {
                status: "PENDING",
              },
              select: {
                id: true,
                scheduledAt: true,
                status: true,
                notes: true,
              },
              orderBy: {
                scheduledAt: "asc",
              },
            },
          },
        },

        calls: {
          select: {
            id: true,
            callDateTime: true,
            duration: true,
            outcome: true,
            notes: true,
            nextFollowUpAt: true,
          },
          orderBy: {
            callDateTime: "desc",
          },
        },

        followUps: {
          where: {
            status: "PENDING",
          },
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            notes: true,
            lead: {
              select: {
                customerName: true,
                mobile: true,
                status: true,
              },
            },
          },
          orderBy: {
            scheduledAt: "asc",
          },
        },
      },
    });

    const result = executives.map((executive) => {
      const convertedLeads = executive.assignedLeads.filter(
        (lead) => lead.status === "CONVERTED"
      );

      const pendingFollowUps = executive.followUps;

      return {
        executiveInfo: {
          id: executive.id,
          name: executive.name,
          email: executive.email,
          joinedAt: executive.createdAt,
        },

        summary: {
          totalAssignedLeads: executive.assignedLeads.length,
          convertedLeads: convertedLeads.length,
          pendingFollowUps: pendingFollowUps.length,
         
        },

        
      };
    });

    return res.status(200).json({
      success: true,
      message: "Sales executive details fetched successfully",
      totalExecutives: result.length,
      data: result,
    });

  } catch (error) {
    console.error("Get Executive Full Data Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch executive details",
    });
  }
};







/* ---------- Helpers ---------- */

const OUTCOMES = Object.values(CallOutcome) as string[];

const leadSelect = { id: true, customerName: true, mobile: true } as const;
const executiveSelect = { id: true, name: true } as const;

const parseId = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const badRequest = (res: Response, message: string) =>
  res.status(400).json({ success: false, message });



/**
 * Optional filters shared by both handlers:
 *   ?leadId=12  ?outcome=BUSY  ?from=2026-11-01  ?to=2026-11-05
 * Returns an error message if a filter is invalid.
 */
function buildFilters(query: Request["query"]): { where: Prisma.CallWhereInput } | { error: string } {
  const where: Prisma.CallWhereInput = {};

  if (query.leadId !== undefined) {
    const leadId = parseId(query.leadId);
    if (!leadId) return { error: "Invalid lead ID" };
    where.leadId = leadId;
  }

  if (query.outcome !== undefined) {
    if (typeof query.outcome !== "string" || !OUTCOMES.includes(query.outcome)) {
      return { error: "Invalid call outcome" };
    }
    where.outcome = query.outcome as CallOutcome;
  }

  const from = query.from !== undefined ? parseDate(query.from) : null;
  const to = query.to !== undefined ? parseDate(query.to) : null;
  if ((query.from !== undefined && !from) || (query.to !== undefined && !to)) {
    return { error: "Invalid date range" };
  }
  if (from || to) {
    where.callDateTime = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  return { where };
}

/* ---------- Admin: every call made by the team ---------- */

export const getAllCalls = async (req: Request, res: Response) => {
  try {
    const filters = buildFilters(req.query);
    if ("error" in filters) return badRequest(res, filters.error);
    const { where } = filters;

    if (req.query.executiveId !== undefined) {
      const executiveId = parseId(req.query.executiveId);
      if (!executiveId) return badRequest(res, "Invalid executive ID");
      where.executiveId = executiveId;
    }

    const calls = await prisma.call.findMany({
      where,
      include: {
        lead: { select: leadSelect },
        executive: { select: executiveSelect },
      },
      orderBy: { callDateTime: "desc" },
    });

    console.log(calls)

    return res.status(200).json({
      success: true,
      message: "Call history fetched successfully",
      count: calls.length,
      data: calls,
    });


  } catch (error) {
    console.error("Get All Calls Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch call history",
    });
  }
};





/* ---------- Helpers ---------- */

const STATUSES = Object.values(FollowUpStatus) as string[];

const followUpInclude = {
  lead: { select: { id: true, customerName: true, mobile: true } },
  executive: { select: { id: true, name: true } },
} as const;



/* ---------- Admin: monitor every follow-up (read only) ---------- */

/**
 * GET /follow-ups
 * Optional filters: ?executiveId=3  ?status=PENDING
 *
 * Admins can only view follow-ups. Completing, cancelling or rescheduling
 * them is done by the executive who owns them, so there is no admin update route.
 */
export const getAllFollowUps = async (req: Request, res: Response) => {
  try {
    const where: Prisma.FollowUpWhereInput = {};

    if (req.query.executiveId !== undefined) {
      const executiveId = parseId(req.query.executiveId);
      if (!executiveId) return badRequest(res, "Invalid executive ID");
      where.executiveId = executiveId;
    }

    if (req.query.status !== undefined) {
      const status = req.query.status;
      if (typeof status !== "string" || !STATUSES.includes(status)) {
        return badRequest(res, "Invalid follow-up status");
      }
      where.status = status as FollowUpStatus;
    }

    const followUps = await prisma.followUp.findMany({
      where,
      include: followUpInclude,
      orderBy: { scheduledAt: "asc" },
    });

    

    return res.status(200).json({
      success: true,
      message: "Follow-ups fetched successfully",
      count: followUps.length,
      data: followUps,
    });
  } catch (error) {
    console.error("Get All Follow-ups Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch follow-ups",
    });
  }
};




/* ---------- Admin dashboard ---------- */

type Range = "today" | "7d" | "30d";
type ReportRange = "today" | "7d" | "30d" | "all";
const RANGES: Range[] = ["today", "7d", "30d"];
const REPORT_RANGES: ReportRange[] = [...RANGES, "all"];
 
/** First moment of the selected period (server time). Same rule as the Call History page. */
function rangeStart(range: Range): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "7d") d.setDate(d.getDate() - 6);
  if (range === "30d") d.setDate(d.getDate() - 29);
  return d;
}
 
/* ---------- Admin dashboard ---------- */
 
/**
 * GET /admin/dashboard?range=today|7d|30d   (default 30d)
 *
 * What the range changes:
 *   - Calls and connected calls (overall and per executive): only calls inside the range.
 * Everything else is the situation right now:
 *   - Lead totals, converted leads, pending and overdue follow-ups.
 * (Your schema has no "converted at" date, so conversions can't be limited to a range.)
 *
 * Pending = still PENDING and due now or later. Overdue = still PENDING and already past due.
 */
export const getAdminDashboard = async (req: Request, res: Response) => {
  try {
    const rangeParam = req.query.range ?? "30d";
    if (typeof rangeParam !== "string" || !RANGES.includes(rangeParam as Range)) {
      return res.status(400).json({ success: false, message: "Invalid range. Use today, 7d or 30d." });
    }
 
    const from = rangeStart(rangeParam as Range);
    const now = new Date();
 
    const callsInRange = { callDateTime: { gte: from } };
    const connectedInRange = { ...callsInRange, outcome: { in: CONNECTED_OUTCOMES } };
    const pending = { status: "PENDING" as const, scheduledAt: { gte: now } };
    const overdue = { status: "PENDING" as const, scheduledAt: { lt: now } };
 
    // Team totals
    const [
      executives,
      totalLeads,
      assignedLeads,
      unassignedLeads,
      convertedLeads,
      totalCalls,
      connectedCalls,
      pendingFollowUps,
      overdueFollowUps,
    ] = await Promise.all([
      prisma.user.findMany({
        where: { role: "SALES_EXECUTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.lead.count(),
      prisma.lead.count({ where: { assignedToId: { not: null } } }),
      prisma.lead.count({ where: { assignedToId: null } }),
      prisma.lead.count({ where: { status: "CONVERTED" } }),
      prisma.call.count({ where: callsInRange }),
      prisma.call.count({ where: connectedInRange }),
      prisma.followUp.count({ where: pending }),
      prisma.followUp.count({ where: overdue }),
    ]);
 
    // Per executive, grouped in the database so it stays 6 queries however many executives there are
    const [leadsBy, convertedBy, callsBy, connectedBy, pendingBy, overdueBy] = await Promise.all([
      prisma.lead.groupBy({ by: ["assignedToId"], where: { assignedToId: { not: null } }, _count: { _all: true } }),
      prisma.lead.groupBy({
        by: ["assignedToId"],
        where: { assignedToId: { not: null }, status: "CONVERTED" },
        _count: { _all: true },
      }),
      prisma.call.groupBy({ by: ["executiveId"], where: callsInRange, _count: { _all: true } }),
      prisma.call.groupBy({ by: ["executiveId"], where: connectedInRange, _count: { _all: true } }),
      prisma.followUp.groupBy({ by: ["executiveId"], where: pending, _count: { _all: true } }),
      prisma.followUp.groupBy({ by: ["executiveId"], where: overdue, _count: { _all: true } }),
    ]);
 
    const leadsMap = new Map(leadsBy.map((r) => [r.assignedToId as number, r._count._all] as [number, number]));
    const convertedMap = new Map(convertedBy.map((r) => [r.assignedToId as number, r._count._all] as [number, number]));
    const callsMap = new Map(callsBy.map((r) => [r.executiveId, r._count._all] as [number, number]));
    const connectedMap = new Map(connectedBy.map((r) => [r.executiveId, r._count._all] as [number, number]));
    const pendingMap = new Map(pendingBy.map((r) => [r.executiveId, r._count._all] as [number, number]));
    const overdueMap = new Map(overdueBy.map((r) => [r.executiveId, r._count._all] as [number, number]));
 
    const executiveStats = executives.map((e) => ({
      id: e.id,
      name: e.name,
      assignedLeads: leadsMap.get(e.id) ?? 0,
      totalCalls: callsMap.get(e.id) ?? 0,
      connectedCalls: connectedMap.get(e.id) ?? 0,
      pendingFollowUps: pendingMap.get(e.id) ?? 0,
      overdueFollowUps: overdueMap.get(e.id) ?? 0,
      convertedLeads: convertedMap.get(e.id) ?? 0,
    }));
 
    return res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: {
        totalLeads,
        assignedLeads,
        unassignedLeads,
        totalCalls,
        connectedCalls,
        pendingFollowUps,
        overdueFollowUps,
        convertedLeads,
        executives: executiveStats,
      },
    });
  } catch (error) {
    console.error("Get Admin Dashboard Error:", error);
 
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    });
  }
};



 
/* ---------- Admin: sales executive performance report ---------- */
 
/**
 * GET /admin/reports/executive-performance?range=today|7d|30d|all   (default 30d)
 *
 * Three metrics per executive (all rates are percentages, 0 when the denominator is 0):
 *
 * 1. Call coverage rate = unique assigned leads contacted / total assigned leads x 100
 *    A lead called five times counts once. Only calls inside the range are considered.
 *
 * 2. Connection rate = connected calls / total calls x 100
 *    Connected outcomes are listed in utils/salesMetrics.ts. Only calls inside the range.
 *
 * 3. Conversion rate = converted leads / total assigned leads x 100
 *    Counts leads with status CONVERTED once each, not calls marked CONVERTED.
 *    It is a snapshot, so the range does not change it.
 *
 * Total assigned leads is also a snapshot (the leads each executive owns right now).
 * 
 * 
 */

export const getExecutivePerformanceReport = async (req: Request, res: Response) => {
  try {
    const rangeParam = req.query.range ?? "30d";
    if (typeof rangeParam !== "string" || !REPORT_RANGES.includes(rangeParam as ReportRange)) {
      return res.status(400).json({ success: false, message: "Invalid range. Use today, 7d, 30d or all." });
    }
    const range = rangeParam as ReportRange;
    const from = range === "all" ? null : rangeStart(range);      
 
    const callsInRange: Prisma.CallWhereInput = from ? { callDateTime: { gte: from } } : {};
    const connectedInRange: Prisma.CallWhereInput = { ...callsInRange, outcome: { in: CONNECTED_OUTCOMES } };
 
    const [executives, assignedBy, contactedBy, convertedBy, callsBy, connectedBy] = await Promise.all([
      prisma.user.findMany({
        where: { role: "SALES_EXECUTIVE" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      // Total assigned leads
      prisma.lead.groupBy({
        by: ["assignedToId"],
        where: { assignedToId: { not: null } },
        _count: { _all: true },
      }),
      // Unique assigned leads contacted: a lead is counted once however many calls it had
      prisma.lead.groupBy({
        by: ["assignedToId"],
        where: { assignedToId: { not: null }, calls: { some: callsInRange } },
        _count: { _all: true },
      }),
      // Unique converted leads
      prisma.lead.groupBy({
        by: ["assignedToId"],
        where: { assignedToId: { not: null }, status: "CONVERTED" },
        _count: { _all: true },
      }),
      // Calls made, and calls that connected
      prisma.call.groupBy({ by: ["executiveId"], where: callsInRange, _count: { _all: true } }),
      prisma.call.groupBy({ by: ["executiveId"], where: connectedInRange, _count: { _all: true } }),
    ]);
 
    const assignedMap = new Map(assignedBy.map((r) => [r.assignedToId as number, r._count._all] as [number, number]));
    const contactedMap = new Map(contactedBy.map((r) => [r.assignedToId as number, r._count._all] as [number, number]));
    const convertedMap = new Map(convertedBy.map((r) => [r.assignedToId as number, r._count._all] as [number, number]));
    const callsMap = new Map(callsBy.map((r) => [r.executiveId, r._count._all] as [number, number]));
    const connectedMap = new Map(connectedBy.map((r) => [r.executiveId, r._count._all] as [number, number]));
 
    const rows = executives.map((e) => {
      const assignedLeads = assignedMap.get(e.id) ?? 0;
      const leadsContacted = contactedMap.get(e.id) ?? 0;
      const totalCalls = callsMap.get(e.id) ?? 0;
      const connectedCalls = connectedMap.get(e.id) ?? 0;
      const convertedLeads = convertedMap.get(e.id) ?? 0;
 
      return {
        id: e.id,
        name: e.name,
        email: e.email,
        assignedLeads,
        leadsContacted,
        callCoverageRate: percentage(leadsContacted, assignedLeads),
        totalCalls,
        connectedCalls,
        connectionRate: percentage(connectedCalls, totalCalls),
        convertedLeads,
        conversionRate: percentage(convertedLeads, assignedLeads),
      };
    });
 
    // Team totals: rates come from the summed counts, not from averaging the executives' rates
    const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((total, r) => total + pick(r), 0);
    const teamAssigned = sum((r) => r.assignedLeads);
    const teamContacted = sum((r) => r.leadsContacted);
    const teamCalls = sum((r) => r.totalCalls);
    const teamConnected = sum((r) => r.connectedCalls);
    const teamConverted = sum((r) => r.convertedLeads);
 
    return res.status(200).json({
      success: true,
      message: "Executive performance report fetched successfully",
      data: {
        range,
        from: from ? from.toISOString() : null,
        generatedAt: new Date().toISOString(),
        connectedOutcomes: CONNECTED_OUTCOMES,
        executives: rows,
        totals: {
          assignedLeads: teamAssigned,
          leadsContacted: teamContacted,
          callCoverageRate: percentage(teamContacted, teamAssigned),
          totalCalls: teamCalls,
          connectedCalls: teamConnected,
          connectionRate: percentage(teamConnected, teamCalls),
          convertedLeads: teamConverted,
          conversionRate: percentage(teamConverted, teamAssigned),
        },
      },
    });
  } catch (error) {
    console.error("Get Executive Performance Report Error:", error);
 
    return res.status(500).json({
      success: false,
      message: "Failed to fetch the performance report",
    });
  }
};
 
 




