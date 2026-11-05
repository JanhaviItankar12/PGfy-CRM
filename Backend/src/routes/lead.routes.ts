import { Router } from "express";

import {getAllLeads} from "../controllers/lead.controller";
import {getLeadById} from "../controllers/lead.controller";
import {createLead} from "../controllers/lead.controller";
import {updateLead} from "../controllers/lead.controller";
import {assignLeads} from "../controllers/lead.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";


const router = Router();


router.get("/", authenticate, authorize("ADMIN"),getAllLeads);
router.get("/:id",authenticate, getLeadById);
router.post("/", authenticate, authorize("ADMIN"),createLead);
router.put("/:id",authenticate, authorize("ADMIN") ,updateLead);
router.patch("/assign", authenticate, authorize("ADMIN"),assignLeads);

export default router;