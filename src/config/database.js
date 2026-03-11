import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mariadb",
    logging: false, // Đổi thành console.log để xem SQL query
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      // Mặc định cho tất cả model
      timestamps: true,    // tự động thêm createdAt, updatedAt
      underscored: true,   // dùng snake_case cho tên cột (created_at thay vì createdAt)
      freezeTableName: true, // không tự động thêm "s" vào tên bảng
    },
  }
);

export default sequelize;