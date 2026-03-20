import { Router } from "express";
import {
  getQuestionBank,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../controllers/questionBankGiangVienController.js";

const router = Router();

router.get("/", getQuestionBank);
router.get("/:id", getQuestionById);
router.post("/", createQuestion);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);

export default router;
