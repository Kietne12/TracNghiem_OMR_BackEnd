import jwt from "jsonwebtoken";
import { Account } from "../models/index.js";

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

  // Tìm account theo username
  const account = await Account.findOne({
  where: { username },
  });

  if (!account) {
  return res.status(401).json({
  message: "Username hoặc mật khẩu không đúng",
  });
  }

  // So sánh mật khẩu
  const isMatch = await account.comparePassword(password);

  if (!isMatch) {
  return res.status(401).json({
  message: "Username hoặc mật khẩu không đúng",
  });
  }

  // Tạo JWT token
  const token = jwt.sign(
  {
  id: account.id,
  role: account.role,
  },
  process.env.JWT_SECRET,
  { expiresIn: "8h" }
  );

  return res.status(200).json({
  message: "Đăng nhập thành công",
  token,
  account: {
  id: account.id,
  username: account.username,
  role: account.role,
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
  const account = await Account.findByPk(req.user.id, {
  attributes: { exclude: ["password"] },
  });

  if (!account) {
  return res.status(404).json({
  message: "Không tìm thấy tài khoản",
  });
  }

  return res.status(200).json({
  account,
  });
  } catch (error) {
  console.error("GetMe error:", error);
  return res.status(500).json({
  message: "Lỗi server",
  });
  }
  };
