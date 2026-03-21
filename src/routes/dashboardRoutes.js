import express from "express";
import {
  getDashboard,
  getDashboardStats,
  getRecentExams,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", getDashboard);
router.get("/stats", getDashboardStats);
router.get("/recent-exams", getRecentExams);

export default router;
