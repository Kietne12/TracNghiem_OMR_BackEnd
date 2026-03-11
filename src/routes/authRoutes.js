import { Router } from "express";
import { login, getMe } from "../controllers/authController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = Router();

// Đăng nhập
router.post("/login", login);

// Lấy thông tin user hiện tại (cần đăng nhập)
router.get("/me", verifyToken, getMe);

export default router;
