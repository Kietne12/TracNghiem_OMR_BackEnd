import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { Account, User } from "../models/index.js";

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
    }

    // Tìm user theo email hoặc mã số sinh viên (dùng Sequelize ORM)
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email }, { mssv: email }],
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // So sánh mật khẩu (dùng instance method của model)
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // Tạo JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

/**
 * GET /api/auth/me
 * Lấy thông tin user hiện tại (cần token)
 */
export const getMe = async (req, res) => {
  try {
    const user = await Account.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("GetMe error:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};
