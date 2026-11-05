import { Request, Response } from "express";
import  prisma  from "../config/prisma";
import { FollowUpStatus } from "../generated/prisma/client";

import { CONNECTED_OUTCOMES, percentage } from "../utils/SalesMetrices";

// Assuming authentication middleware attaches req.user.id
// to the request.

//excutiveId is the integer
const getExecutiveId = (req: Request): number => {
  if (!req.user || !req.user.id) {
    throw new Error("User not authenticated");
  }

    const executiveId = Number(req.user.id);
    return executiveId;
  }


// Allowed lead statuses
const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "NOT_INTERESTED",
  "FOLLOW_UP",
  "VISIT_SCHEDULED",
  "CONVERTED",
] as const;

// Allowed call outcomes
const CALL_OUTCOMES = [
  "CONNECTED",
  "NOT_ANSWERED",
  "BUSY",
  "SWITCHED_OFF",
  "INTERESTED",
  "NOT_INTERESTED",
  "CALL_BACK_REQUESTED",
  "VISIT_SCHEDULED",
  "CONVERTED",
] as const;

// --------------------------------------------------
// 1. GET MY ASSIGNED LEADS
// GET /executive/leads
// --------------------------------------------------

export const getMyLeads = async (req: Request, res: Response) => {
  try {
    const executiveId = getExecutiveId(req);

    const { search, status } = req.query;

    const where: any = {
      assignedToId: executiveId,
    };

    if (status) {
      if (!LEAD_STATUSES.includes(status as any)) {
        return res.status(400).json({
          success: false,
          message: "Invalid lead status",
        });
      }

      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          customerName: {
            contains: String(search),
            mode: "insensitive",
          },
        },
        {
          mobile: {
            contains: String(search),
          },
        },
        {
          email: {
            contains: String(search),
            mode: "insensitive",
          },
        },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        calls: {
          select: {
            callDateTime: true,
          },
          orderBy: {
            callDateTime: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Assigned leads fetched successfully",
      data: leads,
    });
  } catch (error) {
    console.error("Get My Leads Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assigned leads",
    });
  }
};


// --------------------------------------------------
// 2. GET MY LEAD BY ID
// GET /executive/leads/:id
// --------------------------------------------------

export const getMyLead = async (req: Request, res: Response) => {
  try {
    const executiveId = getExecutiveId(req);
    const leadId = Number(req.params.id);

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        assignedToId: executiveId,
      },
      include: {
        calls: {
          orderBy: {
            callDateTime: "desc",
          },
        },
        followUps: {
          orderBy: {
            scheduledAt: "desc",
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found or not assigned to you",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead details fetched successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Get My Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch lead details",
    });
  }
};


// --------------------------------------------------
// 3. UPDATE MY LEAD STATUS
// PATCH /executive/leads/:id/status
// --------------------------------------------------

export const updateMyLeadStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const executiveId = getExecutiveId(req);
    const leadId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    if (!LEAD_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead status",
      });
    }

    const result = await prisma.lead.updateMany({
      where: {
        id: leadId,
        assignedToId: executiveId,
      },
      data: {
        status,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead not found or not assigned to you",
      });
    }

    const updatedLead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    return res.status(200).json({
      success: true,
      message: "Lead status updated successfully",
      data: updatedLead,
    });
  } catch (error) {
    console.error("Update Lead Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update lead status",
    });
  }
};


// --------------------------------------------------
// 4. GET CALLS FOR A LEAD
// GET /executive/leads/:id/calls
// --------------------------------------------------

export const getLeadCalls = async (req: Request, res: Response) => {
  try {
    const executiveId = getExecutiveId(req);
    const leadId = Number(req.params.id);

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        assignedToId: executiveId,
      },
      select: {
        id: true,
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found or not assigned to you",
      });
    }

    const calls = await prisma.call.findMany({
      where: {
        leadId,
        executiveId,
      },
      orderBy: {
        callDateTime: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Call history fetched successfully",
      data: calls,
    });
  } catch (error) {
    console.error("Get Lead Calls Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch call history",
    });
  }
};


// --------------------------------------------------
// 5. LOG A NEW CALL
// POST /executive/leads/:id/calls
// --------------------------------------------------

export const logCall = async (req: Request, res: Response) => {
  try {
    const executiveId = getExecutiveId(req);
    const leadId = Number(req.params.id);

    const {
      callDateTime,
      duration,
      outcome,
      notes,
      nextFollowUpAt,
    } = req.body;

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    if (!CALL_OUTCOMES.includes(outcome)) {
      return res.status(400).json({
        success: false,
        message: "Invalid call outcome",
      });
    }

    const callDate = new Date(callDateTime);

    if (!callDateTime || Number.isNaN(callDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Valid call date and time are required",
      });
    }

    if (
      duration === undefined ||
      !Number.isInteger(Number(duration)) ||
      Number(duration) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid call duration is required",
      });
    }

    const followUpDate = nextFollowUpAt
      ? new Date(nextFollowUpAt)
      : null;

    if (
      nextFollowUpAt &&
      (!followUpDate || Number.isNaN(followUpDate.getTime()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid next follow-up date",
      });
    }

    // Check whether this lead belongs to the logged-in executive
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        assignedToId: executiveId,
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found or not assigned to you",
      });
    }

    // Create call and optional follow-up together
    const call = await prisma.$transaction(async (tx) => {
      const newCall = await tx.call.create({
        data: {
          leadId,
          executiveId,
          callDateTime: callDate,
          duration: Number(duration),
          outcome,
          notes: notes || null,
          nextFollowUpAt: followUpDate,
        },
      });

      if (followUpDate) {
        await tx.followUp.create({
          data: {
            leadId,
            executiveId,
            scheduledAt: followUpDate,
            status: "PENDING",
            notes: notes || null,
          },
        });
      }

      return newCall;
    });

    return res.status(201).json({
      success: true,
      message: "Call recorded successfully",
      data: call,
    });
  } catch (error) {
    console.error("Log Call Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record call",
    });
  }
};


// --------------------------------------------------
// 6. GET FOLLOW-UPS FOR A LEAD
// GET /executive/leads/:id/follow-ups
// --------------------------------------------------

export const getLeadFollowUps = async (
  req: Request,
  res: Response
) => {
  try {
    const executiveId = getExecutiveId(req);
    const leadId = Number(req.params.id);

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        assignedToId: executiveId,
      },
      select: {
        id: true,
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found or not assigned to you",
      });
    }

    const followUps = await prisma.followUp.findMany({
      where: {
        leadId,
        executiveId,
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Follow-ups fetched successfully",
      data: followUps,
    });
  } catch (error) {
    console.error("Get Lead Follow-ups Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch follow-ups",
    });
  }
};


// --------------------------------------------------
// 7. SCHEDULE A FOLLOW-UP
// POST /executive/leads/:id/follow-ups
// --------------------------------------------------

export const scheduleFollowUp = async (
  req: Request,
  res: Response
) => {
  try {
    const executiveId = getExecutiveId(req);
    const leadId = Number(req.params.id);

    const { scheduledAt, notes } = req.body;

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const scheduledDate = new Date(scheduledAt);

    if (!scheduledAt || Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Valid follow-up date is required",
      });
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        assignedToId: executiveId,
      },
      select: {
        id: true,
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found or not assigned to you",
      });
    }

    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        executiveId,
        scheduledAt: scheduledDate,
        status: "PENDING",
        notes: notes || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Follow-up scheduled successfully",
      data: followUp,
    });
  } catch (error) {
    console.error("Schedule Follow-up Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to schedule follow-up",
    });
  }
};


export const getMyFollowUps = async (req: Request, res: Response) => {
  try {
    const executiveId = getExecutiveId(req);

    if (!executiveId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const followUps = await prisma.followUp.findMany({
      where: {
        executiveId: executiveId,
      },
      include: {
        lead: {
          select: {
            id: true,
            customerName: true,
            mobile: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      data: followUps,
    });
  } catch (error) {
    console.error("Get executive follow-ups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch follow-ups",
    });
  }
};

/**
 * PATCH /executive/follow-ups/:id
 * Update follow-up status to COMPLETED or CANCELLED.
 */
export const updateFollowUpStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const executiveId = getExecutiveId(req);
    const followUpId = Number(req.params.id);
    const { status } = req.body;

    if (!executiveId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!Number.isInteger(followUpId) || followUpId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid follow-up ID",
      });
    }

    const allowedStatuses: FollowUpStatus[] = [
      FollowUpStatus.COMPLETED,
      FollowUpStatus.CANCELLED,
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be COMPLETED or CANCELLED",
      });
    }

    // Check that this follow-up belongs to the logged-in executive.
    const existingFollowUp = await prisma.followUp.findFirst({
      where: {
        id: followUpId,
        executiveId: executiveId,
      },
    });

    if (!existingFollowUp) {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found",
      });
    }

    const updatedFollowUp = await prisma.followUp.update({
      where: {
        id: followUpId,
      },
      data: {
        status,
      },
      include: {
        lead: {
          select: {
            id: true,
            customerName: true,
            mobile: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Follow-up status updated successfully",
      data: updatedFollowUp,
    });
  } catch (error) {
    console.error("Update follow-up status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update follow-up status",
    });
  }
};


export const getMyCalls = async (req: Request, res: Response) => {
  try {
    const executiveId = getExecutiveId(req);

    if (!executiveId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const calls = await prisma.call.findMany({
      where: {
        executiveId: executiveId,
      },
      include: {
        lead: {
          select: {
            id: true,
            customerName: true,
            mobile: true,
          },
        },
      },
      orderBy: {
        callDateTime: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: calls,
    });
  } catch (error) {
    console.error("Get My Calls Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch call history",
    });
  }
};

export const getExecutiveSummaryDataById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
 
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid executive ID",
      });
    }
 
    const executive = await prisma.user.findFirst({
      where: { id, role: "SALES_EXECUTIVE" },
      select: { id: true, name: true, email: true },
    });
 
    if (!executive) {
      return res.status(404).json({
        success: false,
        message: "Sales executive not found",
      });
    }
 
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
 
    const pending = { executiveId: id, status: "PENDING" as const, scheduledAt: { gte: now } };
    const dueToday = { executiveId: id, status: "PENDING" as const, scheduledAt: { gte: now, lte: endOfToday } };
    const overdue = { executiveId: id, status: "PENDING" as const, scheduledAt: { lt: now } };
 
    const followUpSelect = {
      id: true,
      scheduledAt: true,
      notes: true,
      lead: { select: { id: true, customerName: true, mobile: true } },
    } as const;
 
    const [
      assignedLeadsCount,
      leadsContactedCount,
      totalCallsCount,
      connectedCallsCount,
      pendingFollowUpsCount,
      overdueFollowUpsCount,
      convertedLeadsCount,
      todayCount,
      todayItems,
      overdueItems,
      recentLeads,
    ] = await Promise.all([
      prisma.lead.count({ where: { assignedToId: id } }),
 
      // Unique assigned leads that have at least one call
      prisma.lead.count({ where: { assignedToId: id, calls: { some: {} } } }),
 
      prisma.call.count({ where: { executiveId: id } }),
 
      prisma.call.count({ where: { executiveId: id, outcome: { in: CONNECTED_OUTCOMES } } }),
 
      prisma.followUp.count({ where: pending }),
 
      prisma.followUp.count({ where: overdue }),
 
      prisma.lead.count({ where: { assignedToId: id, status: "CONVERTED" } }),
 
      prisma.followUp.count({ where: dueToday }),
 
      prisma.followUp.findMany({
        where: dueToday,
        select: followUpSelect,
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
 
      prisma.followUp.findMany({
        where: overdue,
        select: followUpSelect,
        orderBy: { scheduledAt: "asc" }, // most overdue first
        take: 5,
      }),
 
      // Your schema has no "assigned at" date, so "recently assigned" uses the last update,
      // which assigning a lead sets. See the note in the reply about adding assignedAt.
      prisma.lead.findMany({
        where: { assignedToId: id },
        select: {
          id: true,
          customerName: true,
          mobile: true,
          propertyCategory: true,
          preferredLocation: true,
          budget: true,
          leadSource: true,
          status: true,
          enquiryDate: true,
          updatedAt: true,
          _count: { select: { calls: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);
 
    return res.status(200).json({
      success: true,
      message: "Executive dashboard data fetched successfully",
      data: {
        executiveInfo: executive,
 
        summary: {
          assignedLeads: assignedLeadsCount,
          leadsContacted: leadsContactedCount,
          totalCalls: totalCallsCount,
          pendingFollowUps: pendingFollowUpsCount,
          overdueFollowUps: overdueFollowUpsCount,
          convertedLeads: convertedLeadsCount,
        },
 
        // Rates are percentages (0 to 100) and are 0 when the denominator is 0
        performance: {
          callCoverageRate: percentage(leadsContactedCount, assignedLeadsCount),
          conversionRate: percentage(convertedLeadsCount, assignedLeadsCount),
          connectionRate: percentage(connectedCallsCount, totalCallsCount),
          connectedCalls: connectedCallsCount,
        },
 
        followUps: {
          today: { total: todayCount, items: todayItems },
          overdue: { total: overdueFollowUpsCount, items: overdueItems },
        },
 
        recentLeads: recentLeads.map(({ _count, ...lead }) => ({
          ...lead,
          callCount: _count.calls,
        })),
      },
    });
  } catch (error) {
    console.error("Get Executive Data Error:", error);
 
    return res.status(500).json({
      success: false,
      message: "Failed to fetch executive dashboard data",
    });
  }
};
 