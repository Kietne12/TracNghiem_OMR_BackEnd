import jwt from "jsonwebtoken";
import { Account, CaiDatHeThong, User } from "../models/index.js";

const LOCKED_MESSAGE = "Tài khoản đã bị khóa do đăng nhập sai quá nhiều";
const DEFAULT_SESSION_MINUTES = 30;

const normalizeSessionMinutes = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_MINUTES;
  }

  return parsed;
};

/**

* POST /api/auth/login
* Body: { username, password }
  */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        message: "Vui lòng nhập username và mật khẩu",
      });
    }

    const account = await Account.findOne({
      where: { username },
      include: [
        {
          model: User,
          as: "nguoi_dung",
          attributes: ["ho_ten", "email", "mssv", "trang_thai"],
        },
      ],
    });

    if (!account) {
      return res.status(401).json({
        message: "Username hoặc mật khẩu không đúng",
      });
    }

    // Khóa bởi admin: không cho đăng nhập.
    if (!account.nguoi_dung?.trang_thai) {
      return res.status(403).json({
        message: LOCKED_MESSAGE,
      });
    }

    // 🔥 LẤY CONFIG
    const settings = await CaiDatHeThong.findOne()
    const maxFailedAttempts = Number(settings?.so_lan_dang_nhap ?? 5)
    const sessionMinutes = normalizeSessionMinutes(settings?.thoi_gian_phien)

    // 🔥 CHECK KHÓA
    if (account.so_lan_sai >= maxFailedAttempts) {
      // Đồng bộ trạng thái khóa để admin nhìn thấy tài khoản đang bị khóa.
      if (account.nguoi_dung?.trang_thai) {
        account.nguoi_dung.trang_thai = false;
        await account.nguoi_dung.save();
      }

      return res.status(403).json({
        message: LOCKED_MESSAGE,
      })
    }
    // So sánh mật khẩu
    const isMatch = await account.comparePassword(password);

    if (!isMatch) {

      account.so_lan_sai += 1
      await account.save()

      if (account.so_lan_sai >= maxFailedAttempts && account.nguoi_dung?.trang_thai) {
        account.nguoi_dung.trang_thai = false;
        await account.nguoi_dung.save();

        return res.status(403).json({
          message: LOCKED_MESSAGE,
        });
      }

      return res.status(401).json({
        message: "Username hoặc mật khẩu không đúng",
      });
    }

    // 🔥 RESET SỐ LẦN SAI
    account.so_lan_sai = 0
    await account.save()

    // Tạo JWT token
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
        ho_ten: account.nguoi_dung?.ho_ten || null,
        email: account.nguoi_dung?.email || null,
        mssv: account.nguoi_dung?.mssv || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Lỗi server",
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
      attributes: { exclude: ["password"] },
      include: [
        {
          model: User,
          as: "nguoi_dung",
          attributes: ["ho_ten", "email", "mssv"],
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
        ho_ten: account.nguoi_dung?.ho_ten || null,
        email: account.nguoi_dung?.email || null,
        mssv: account.nguoi_dung?.mssv || null,
      },
    });
  } catch (error) {
    console.error("GetMe error:", error);
    return res.status(500).json({
      message: "Lỗi server",
    });
  }
};
