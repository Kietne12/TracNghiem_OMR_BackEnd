import jwt from "jsonwebtoken";
import { Account, CaiDatHeThong, User } from "../models/index.js";

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
          attributes: ["ho_ten", "email", "mssv"],
        },
      ],
    });
    console.log("username nhập:", username)
    console.log("password nhập:", password)
    console.log("account tìm được:", account?.username)
    console.log("password DB:", account?.password)

    if (!account) {
      return res.status(401).json({
        message: "Username hoặc mật khẩu không đúng",
      });
    }

    // 🔥 LẤY CONFIG
    const settings = await CaiDatHeThong.findOne()

    // 🔥 CHECK KHÓA
    if (account.so_lan_sai >= settings.so_lan_dang_nhap) {
      return res.status(403).json({
        message: "Tài khoản đã bị khóa"
      })
    }
    // So sánh mật khẩu
    const isMatch = await account.comparePassword(password);
    console.log("match:", isMatch)

    if (!isMatch) {

      account.so_lan_sai += 1
      await account.save()

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
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      message: "Đăng nhập thành công",
      token,
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
