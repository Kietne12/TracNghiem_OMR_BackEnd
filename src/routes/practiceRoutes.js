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

// Routes quản lý bài luyện tập (GiangVien)
router.post("/", verifyToken, createPractice); // Tạo bài luyện tập mới
router.get("/", getPracticeList); // Lấy danh sách bài luyện tập
router.get("/:id", getPracticeDetail); // Lấy chi tiết bài luyện tập
router.put("/:id", verifyToken, updatePractice); // Cập nhật bài luyện tập
router.delete("/:id", verifyToken, deletePractice); // Xóa bài luyện tập

// Routes làm bài luyện tập (SinhVien)
router.post("/:bai_luyen_tap_id/start", verifyToken, startPractice); // Bắt đầu làm bài
router.post("/lich-su/:lich_su_bai_id/submit", verifyToken, submitPractice); // Nộp bài
router.get("/lich-su/:lich_su_bai_id/result", verifyToken, getPracticeResult); // Lấy kết quả

// Routes lịch sử làm bài
router.get(
  "/:bai_luyen_tap_id/history",
  verifyToken,
  getPracticeHistoryForStudent
); // Lấy lịch sử làm bài của sinh viên

// Routes thống kê
router.get("/:bai_luyen_tap_id/statistics", getPracticeStatistics); // Thống kê điểm bài luyện tập
router.get("/thong-ke/student/:sinh_vien_id", getStudentPracticeStatistics); // Thống kê sinh viên

export default router;
