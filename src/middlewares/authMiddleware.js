import jwt from "jsonwebtoken";
import { Account, User } from "../models/index.js";

const LOCKED_MESSAGE = "Tài khoản đã bị khóa do đăng nhập sai quá nhiều";

/**
 * Middleware xác thực token JWT
 */
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Không có token, truy cập bị từ chối",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const account = await Account.findByPk(decoded.id, {
      include: [{
        model: User,
        as: "nguoi_dung",
        attributes: ["id", "trang_thai"],
      }],
      attributes: ["id", "role", "user_id"],
    });

    if (!account) {
      return res.status(401).json({
        message: "Tài khoản không tồn tại",
      });
    }

    if (!account.nguoi_dung?.trang_thai) {
      return res.status(403).json({
        message: LOCKED_MESSAGE,
      });
    }

    req.user = {
      id: account.id,
      role: account.role,
      user_id: account.user_id,
    };

    next();
  } catch (error) {
    return res.status(403).json({
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
};

/**
 * Middleware kiểm tra role
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    next();
  };
};