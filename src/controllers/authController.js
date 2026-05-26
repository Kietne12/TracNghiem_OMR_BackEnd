import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Account, CaiDatHeThong, User } from "../models/index.js";
import { sendMail } from "../utils/mailService.js";

const LOCKED_MESSAGE = "Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần.";
const DEFAULT_SESSION_MINUTES = 30;
const RESET_CODE_TTL_MS = 60 * 1000;

const normalizeSessionMinutes = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_MINUTES;
  }

  return parsed;
};

const normalizeEmail = (value) => (
  typeof value === "string" ? value.trim().toLowerCase() : ""
);

const hashSecret = (value) => (
  crypto.createHash("sha256").update(String(value)).digest("hex")
);

const generateDigitCode = (length = 6) => {
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, "0");
};

const generateTemporaryPassword = () => (
  crypto.randomBytes(9).toString("base64url").slice(0, 6)
);

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Vui lòng nhập tên đăng nhập và mật khẩu",
      });
    }

    const account = await Account.findOne({
      where: { username },
      include: [
        {
          model: User,
          as: "nguoi_dung",
          attributes: ["ho_ten", "email", "mssv", "avatar", "trang_thai"],
        },
      ],
    });

    if (!account) {
      return res.status(401).json({
        message: "Tên đăng nhập hoặc mật khẩu không đúng",
      });
    }

    if (!account.nguoi_dung?.trang_thai) {
      return res.status(403).json({
        message: LOCKED_MESSAGE,
      });
    }

    const settings = await CaiDatHeThong.findOne();
    const maxFailedAttempts = Number(settings?.so_lan_dang_nhap ?? 5);
    const sessionMinutes = normalizeSessionMinutes(settings?.thoi_gian_phien);

    if (account.so_lan_sai >= maxFailedAttempts) {
      if (account.nguoi_dung?.trang_thai) {
        account.nguoi_dung.trang_thai = false;
        await account.nguoi_dung.save();
      }

      return res.status(403).json({
        message: LOCKED_MESSAGE,
      });
    }

    const isMatch = await account.comparePassword(password);

    if (!isMatch) {
      account.so_lan_sai += 1;
      await account.save();

      if (account.so_lan_sai >= maxFailedAttempts && account.nguoi_dung?.trang_thai) {
        account.nguoi_dung.trang_thai = false;
        await account.nguoi_dung.save();

        return res.status(403).json({
          message: LOCKED_MESSAGE,
        });
      }

      return res.status(401).json({
        message: "Tên đăng nhập hoặc mật khẩu không đúng",
      });
    }

    account.so_lan_sai = 0;
    await account.save();

    const token = jwt.sign(
      {
        id: account.id,
        role: account.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: `${sessionMinutes}m` }
    );

    return res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      session_timeout_minutes: sessionMinutes,
      session_timeout_ms: sessionMinutes * 60 * 1000,
      account: {
        id: account.id,
        user_id: account.user_id,
        username: account.username,
        role: account.role,
        must_change_password: Boolean(account.must_change_password),
        ho_ten: account.nguoi_dung?.ho_ten || null,
        email: account.nguoi_dung?.email || null,
        mssv: account.nguoi_dung?.mssv || null,
        avatar: account.nguoi_dung?.avatar || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Không thể đăng nhập. Vui lòng thử lại.",
    });
  }
};

/**
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  try {
    const settings = await CaiDatHeThong.findOne({
      attributes: ["thoi_gian_phien"],
      raw: true,
    });
    const sessionMinutes = normalizeSessionMinutes(settings?.thoi_gian_phien);

    const account = await Account.findByPk(req.user.id, {
      attributes: { exclude: ["password", "reset_code_hash"] },
      include: [
        {
          model: User,
          as: "nguoi_dung",
          attributes: ["ho_ten", "email", "mssv", "avatar"],
        },
      ],
    });

    if (!account) {
      return res.status(404).json({
        message: "Không tìm thấy tài khoản",
      });
    }

    return res.status(200).json({
      session_timeout_minutes: sessionMinutes,
      session_timeout_ms: sessionMinutes * 60 * 1000,
      account: {
        id: account.id,
        user_id: account.user_id,
        username: account.username,
        role: account.role,
        so_lan_sai: account.so_lan_sai,
        must_change_password: Boolean(account.must_change_password),
        ho_ten: account.nguoi_dung?.ho_ten || null,
        email: account.nguoi_dung?.email || null,
        mssv: account.nguoi_dung?.mssv || null,
        avatar: account.nguoi_dung?.avatar || null,
      },
    });
  } catch (error) {
    console.error("GetMe error:", error);
    return res.status(500).json({
      message: "Lỗi server",
    });
  }
};

/**
 * POST /api/auth/forgot-password/request-code
 * Body: { email }
 */
export const requestPasswordResetCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ message: "Vui lòng nhập email" });
    }

    const user = await User.findOne({
      where: { email },
      include: [{
        model: Account,
        as: "tai_khoan",
      }],
    });

    if (!user || !user.tai_khoan) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản với email này" });
    }

    if (!user.trang_thai) {
      return res.status(403).json({ message: LOCKED_MESSAGE });
    }

    const code = generateDigitCode();
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);

    user.tai_khoan.reset_code_hash = hashSecret(code);
    user.tai_khoan.reset_code_expires_at = expiresAt;
    await user.tai_khoan.save();

    await sendMail({
      to: email,
      subject: "Mã xác thực đặt lại mật khẩu",
      text: [
        `Mã xác thực của bạn là: ${code}`,
        "Mã có hiệu lực trong 1 phút.",
        "Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.",
      ].join("\n"),
    });

    return res.json({
      message: "Đã gửi mã xác thực đến email",
      expires_in_seconds: 60,
    });
  } catch (error) {
    console.error("Request password reset code error:", error);
    return res.status(500).json({
      message: "Không gửi được email xác thực. Vui lòng kiểm tra cấu hình email.",
    });
  }
};

/**
 * POST /api/auth/forgot-password/confirm-code
 * Body: { email, code }
 */
export const confirmPasswordResetCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = typeof req.body.code === "string" ? req.body.code.trim() : "";

    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Vui lòng nhập email và mã 6 số" });
    }

    const user = await User.findOne({
      where: { email },
      include: [{
        model: Account,
        as: "tai_khoan",
      }],
    });

    if (!user || !user.tai_khoan) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản với email này" });
    }

    const account = user.tai_khoan;
    if (!account.reset_code_hash || !account.reset_code_expires_at) {
      return res.status(400).json({ message: "Chưa có mã xác thực. Vui lòng gửi mã mới." });
    }

    if (new Date(account.reset_code_expires_at).getTime() < Date.now()) {
      account.reset_code_hash = null;
      account.reset_code_expires_at = null;
      await account.save();
      return res.status(400).json({ message: "Mã xác thực đã hết hạn" });
    }

    if (account.reset_code_hash !== hashSecret(code)) {
      return res.status(400).json({ message: "Mã xác thực không đúng" });
    }

    const temporaryPassword = generateTemporaryPassword();
    account.password = temporaryPassword;
    account.must_change_password = true;
    account.so_lan_sai = 0;
    account.reset_code_hash = null;
    account.reset_code_expires_at = null;
    await account.save();

    await sendMail({
      to: email,
      subject: "Mật khẩu mới của bạn",
      text: [
        `Mật khẩu tạm của bạn là: ${temporaryPassword}`,
        "Vui lòng đăng nhập và đổi mật khẩu ngay.",
      ].join("\n"),
    });

    return res.json({ message: "Mật khẩu mới đã được gửi đến email" });
  } catch (error) {
    console.error("Confirm password reset code error:", error);
    return res.status(500).json({
      message: "Không thể đặt lại mật khẩu. Vui lòng thử lại.",
    });
  }
};

/**
 * PUT /api/auth/change-password
 * Body: { current_password, new_password }
 */
export const changePassword = async (req, res) => {
  try {
    const currentPassword = typeof req.body.current_password === "string" ? req.body.current_password : "";
    const newPassword = typeof req.body.new_password === "string" ? req.body.new_password.trim() : "";

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "Mật khẩu mới phải khác mật khẩu hiện tại" });
    }

    const account = await Account.findByPk(req.user.id);
    if (!account) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    }

    const isMatch = await account.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    account.password = newPassword;
    account.must_change_password = false;
    account.reset_code_hash = null;
    account.reset_code_expires_at = null;
    await account.save();

    return res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Không thể đổi mật khẩu. Vui lòng thử lại." });
  }
};
