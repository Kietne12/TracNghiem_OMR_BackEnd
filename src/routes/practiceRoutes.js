import express from "express";
import {
  createPractice,
  getPracticeList,
  getPracticeDetail,
  updatePractice,
  deletePractice,
  startPractice,
  submitPractice,
  getPracticeResult,
  getPracticeHistoryForStudent,
  getPracticeStatistics,
  getStudentPracticeStatistics,
} from "../controllers/practiceController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createPractice);
router.get("/", verifyToken, getPracticeList);
router.get("/:id", verifyToken, getPracticeDetail);
router.put("/:id", verifyToken, updatePractice);
router.delete("/:id", verifyToken, deletePractice);

router.post("/:bai_luyen_tap_id/start", verifyToken, startPractice);
router.post("/lich-su/:lich_su_bai_id/submit", verifyToken, submitPractice);
router.get("/lich-su/:lich_su_bai_id/result", verifyToken, getPracticeResult);

router.get("/:bai_luyen_tap_id/history", verifyToken, getPracticeHistoryForStudent);
router.get("/:bai_luyen_tap_id/statistics", verifyToken, getPracticeStatistics);
router.get("/thong-ke/student/:sinh_vien_id", verifyToken, getStudentPracticeStatistics);

export default router;
