import { Router } from "express";
import { getExecutives,getExecutiveFullData, getAllCalls, getAllFollowUps, getAdminDashboard, getExecutivePerformanceReport } from "../controllers/admin.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";




const router = Router();

router.get("/executives",  authenticate, authorize("ADMIN"),getExecutives);
router.get("/executives/full-data", authenticate, authorize("ADMIN"), getExecutiveFullData);



router.get("/calls", authenticate, authorize("ADMIN"), getAllCalls);

router.get("/follow-ups", authenticate, authorize("ADMIN"), getAllFollowUps);

router.get("/dashboard", authenticate, authorize("ADMIN"), getAdminDashboard);

router.get("/reports/executive-performance", authenticate, authorize("ADMIN"), getExecutivePerformanceReport);

export default router;