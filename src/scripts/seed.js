/**
 * Script tạo dữ liệu mẫu cho bảng users
 * Chạy: node src/scripts/seed.js
 *
 * Sequelize hooks (beforeCreate) sẽ tự động hash password
 */
import dotenv from "dotenv";
dotenv.config();

import { sequelize, User } from "../models/index.js";

const users = [
  {
    ho_ten: "Admin",
    email: "admin@omr.com",
    mssv: null,
    password: "123456",
    role: "admin",
  },
  {
    ho_ten: "Nguyen Van A",
    email: "gv@omr.com",
    mssv: null,
    password: "123456",
    role: "giangvien",
  },
  {
    ho_ten: "Tran Van B",
    email: "sv@omr.com",
    mssv: "20110001",
    password: "123456",
    role: "sinhvien",
  },
];

const seed = async () => {
  try {
    // Đồng bộ bảng trước khi seed
    await sequelize.sync({ alter: true });
    console.log("Bắt đầu seed dữ liệu...");

    for (const u of users) {
      // findOrCreate: nếu đã tồn tại (theo email) thì bỏ qua
      const [user, created] = await User.findOrCreate({
        where: { email: u.email },
        defaults: u, // password sẽ được hash tự động bởi hook beforeCreate
      });

      console.log(`  ${created ? "✓ Tạo" : "⊘ Đã tồn tại"} ${u.email} (${u.role})`);
    }

    console.log("Seed hoàn tất!");
    process.exit(0);
  } catch (error) {
    console.error("Seed lỗi:", error);
    process.exit(1);
  }
};

seed();
