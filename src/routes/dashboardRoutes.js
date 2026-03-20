import { Router } from "express";
import { getDashboardStats, getRecentExams } from "../controllers/dashboardController.js";

const router = Router();

router.get("/stats", getDashboardStats);
router.get("/recent-exams", getRecentExams);

export default router;
