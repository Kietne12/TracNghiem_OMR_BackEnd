import jwt from "jsonwebtoken";
import { Account, CaiDatHeThong, User } from "../models/index.js";

const LOCKED_MESSAGE = "Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần.";
const DEFAULT_SESSION_MINUTES = 30;

const normalizeSessionMinutes = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_MINUTES;
  }

  return parsed;
};

/**
 * Middleware xÃ¡c thá»±c token JWT
 */
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "KhÃ´ng cÃ³ token, truy cáº­p bá»‹ tá»« chá»‘i",
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
        message: "TÃ i khoáº£n khÃ´ng tá»“n táº¡i",
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

    const settings = await CaiDatHeThong.findOne({
      attributes: ["thoi_gian_phien"],
      raw: true,
    });
    const sessionMinutes = normalizeSessionMinutes(settings?.thoi_gian_phien);
    const refreshedToken = jwt.sign(
      {
        id: account.id,
        role: account.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: `${sessionMinutes}m` }
    );

    res.setHeader("X-Session-Token", refreshedToken);
    res.setHeader("X-Session-Timeout-Minutes", String(sessionMinutes));
    res.setHeader("X-Session-Timeout-Ms", String(sessionMinutes * 60 * 1000));

    next();
  } catch (error) {
    return res.status(403).json({
      message: "Token khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n",
    });
  }
};

/**
 * Middleware kiá»ƒm tra role
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p",
      });
    }

    next();
  };
};
