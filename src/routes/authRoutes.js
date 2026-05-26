import { Router } from "express";
import {
  changePassword,
  confirmPasswordResetCode,
  getMe,
  login,
  requestPasswordResetCode,
} from "../controllers/authController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/login", login);
router.post("/forgot-password/request-code", requestPasswordResetCode);
router.post("/forgot-password/confirm-code", confirmPasswordResetCode);

router.get("/me", verifyToken, getMe);
router.put("/change-password", verifyToken, changePassword);

export default router;
