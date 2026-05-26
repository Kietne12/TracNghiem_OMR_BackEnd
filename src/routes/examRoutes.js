import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import {
  createExam,
  getExams,
  getStudentExamHistory,
  getStudentExamAttemptDetail,
  getExamById,
  submitExam,
  getClasses,
  getSubjectsForLearning,
  updateExamConfig,
  getOmrTemplate,
  uploadOmrImage,
  deleteExam,
  getExamGradingResults,
  getExamGradingResultDetail,
  downloadOmrExam,
  downloadOmrSheet,
} from "../controllers/examController.js";

const router = Router();

const uploadDir = path.resolve("uploads", "omr");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage });

// ===== CLASSES =====
router.get("/classes", getClasses);
router.get("/subjects", getSubjectsForLearning);

// ===== EXAMS =====
router.post("/", createExam);
router.get("/", getExams);
router.get("/history/student", getStudentExamHistory);
router.get("/history/student/:sinh_vien_id", getStudentExamHistory);
router.get("/history/attempt/:attemptId", getStudentExamAttemptDetail);
router.get("/:id", getExamById);
router.put("/:id/config", updateExamConfig);
router.delete("/:id", deleteExam);
router.get("/:id/grading-results", getExamGradingResults);
router.get("/:id/grading-results/:attemptId", getExamGradingResultDetail);
router.get("/:id/omr-template", getOmrTemplate);
router.get("/:id/omr/download-exam", downloadOmrExam);
router.get("/:id/omr/download-sheet", downloadOmrSheet);
router.post("/:id/omr/upload", upload.single("omr_image"), uploadOmrImage);

// ===== SUBMIT =====
router.post("/:id/submit", submitExam);

export default router;
