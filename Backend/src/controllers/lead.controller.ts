import { Request, Response } from "express";
import prisma from "../config/prisma";

export const getAllLeads = async (req: Request, res: Response) => {
  try {
    const { search, status, assignedToId } = req.query;

    const leads = await prisma.lead.findMany({
      where: {
        ...(status && {
          status: status as any,
        }),

        ...(assignedToId && {
          assignedToId:
            assignedToId === "unassigned"
              ? null
              : Number(assignedToId),
        }),

        ...(search && {
          OR: [
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
            {
              preferredLocation: {
                contains: String(search),
                mode: "insensitive",
              },
            },
          ],
        }),
      },

      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        calls: true,
      },

      orderBy: {
        enquiryDate: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error("Get Leads Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
    });
  }
};

export const getLeadById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        calls: {
          orderBy: {
            callDateTime: "desc",
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Get Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch lead",
    });
  }
};


export const createLead = async (req: Request, res: Response) => {
  try {
    const {
      customerName,
      mobile,
      email,
      propertyCategory,
      preferredLocation,
      budget,
      leadSource,
      assignedToId,
      status,
    } = req.body;

    if (
      !customerName ||
      !mobile ||
      !propertyCategory ||
      !preferredLocation ||
      budget === undefined ||
      !leadSource
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required lead fields",
      });
    }

    if (!/^\d{10}$/.test(String(mobile))) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must contain exactly 10 digits",
      });
    }

    if (!Number.isFinite(Number(budget)) || Number(budget) < 0) {
      return res.status(400).json({
        success: false,
        message: "Budget must be a valid non-negative number",
      });
    }

    if (assignedToId !== undefined && assignedToId !== null) {
      const executive = await prisma.user.findFirst({
        where: {
          id: Number(assignedToId),
          role: "SALES_EXECUTIVE",
        },
      });

      if (!executive) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales executive",
        });
      }
    }

    const lead = await prisma.lead.create({
      data: {
        customerName: String(customerName).trim(),
        mobile: String(mobile),
        email: email || null,
        propertyCategory,
        preferredLocation,
        budget: Number(budget),
        leadSource,
        assignedToId:
          assignedToId === undefined || assignedToId === null
            ? null
            : Number(assignedToId),
        status: status || "NEW",
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Create Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create lead",
    });
  }
};



export const updateLead = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const {
      customerName,
      mobile,
      email,
      propertyCategory,
      preferredLocation,
      budget,
      leadSource,
      status,
    } = req.body;

    const existingLead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (mobile !== undefined && !/^\d{10}$/.test(String(mobile))) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must contain exactly 10 digits",
      });
    }

    if (
      budget !== undefined &&
      (!Number.isFinite(Number(budget)) || Number(budget) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget",
      });
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        ...(customerName !== undefined && { customerName }),
        ...(mobile !== undefined && { mobile: String(mobile) }),
        ...(email !== undefined && { email: email || null }),
        ...(propertyCategory !== undefined && { propertyCategory }),
        ...(preferredLocation !== undefined && { preferredLocation }),
        ...(budget !== undefined && { budget: Number(budget) }),
        ...(leadSource !== undefined && { leadSource }),
        ...(status !== undefined && { status }),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: updatedLead,
    });
  } catch (error) {
    console.error("Update Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update lead",
    });
  }
};


export const assignLeads = async (req: Request, res: Response) => {
  try {
    const { leadIds, executiveId } = req.body;

    if (
      !Array.isArray(leadIds) ||
      leadIds.length === 0 ||
      !leadIds.every(
        (id: unknown) => Number.isInteger(Number(id)) && Number(id) > 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid lead IDs",
      });
    }

    const uniqueLeadIds = [...new Set(leadIds.map(Number))];

    // executiveId = null means unassign
    let executive = null;

    if (executiveId !== null) {
      executive = await prisma.user.findFirst({
        where: {
          id: Number(executiveId),
          role: "SALES_EXECUTIVE",
        },
      });

      if (!executive) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales executive",
        });
      }
    }

    const existingLeads = await prisma.lead.findMany({
      where: {
        id: { in: uniqueLeadIds },
      },
      select: { id: true },
    });

    if (existingLeads.length !== uniqueLeadIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more leads were not found",
      });
    }

    const result = await prisma.lead.updateMany({
      where: {
        id: { in: uniqueLeadIds },
      },
      data: {
        assignedToId: executive ? executive.id : null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Leads assigned successfully",
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Assign Leads Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to assign leads",
    });
  }
};