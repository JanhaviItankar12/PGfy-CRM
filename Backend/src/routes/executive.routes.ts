import { Router } from "express";

import {
  getMyLeads,
  getMyLead,
  updateMyLeadStatus,
  getLeadCalls,
  logCall,
  getLeadFollowUps,
  scheduleFollowUp,
  getMyFollowUps,
  updateFollowUpStatus,
  getMyCalls,
  getExecutiveSummaryDataById,
} from "../controllers/excutiveLead.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";


const router = Router();

router.use(authenticate, authorize("SALES_EXECUTIVE"));

router.get("/leads", getMyLeads);
router.get("/leads/:id", getMyLead);
router.patch("/leads/:id/status", updateMyLeadStatus);

router.get("/leads/:id/calls", getLeadCalls);
router.post("/leads/:id/calls", logCall);

router.get("/leads/:id/follow-ups", getLeadFollowUps);
router.post("/leads/:id/follow-ups", scheduleFollowUp);

router.get(
  "/follow-ups",
  getMyFollowUps
);

router.patch(
  "/follow-ups/:id",
  updateFollowUpStatus
);

//executive to get my calls
router.get(
  "/calls",
  getMyCalls
);

router.get("/:id/dashboard", authenticate, authorize("SALES_EXECUTIVE"), getExecutiveSummaryDataById);



export default router;