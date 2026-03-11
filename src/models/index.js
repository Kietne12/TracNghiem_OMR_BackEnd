/**
 * File tập trung export tất cả models và định nghĩa quan hệ (associations)
 * Tương tự như package chứa các @Entity trong Hibernate
 *
 * Khi thêm model mới, import ở đây và định nghĩa quan hệ bên dưới.
 */
import sequelize from "../config/database.js";
import User from "./User.js";

// ============================
// Định nghĩa quan hệ giữa các bảng ở đây
// Ví dụ:
// User.hasMany(Exam, { foreignKey: "created_by" });
// Exam.belongsTo(User, { foreignKey: "created_by" });
// ============================

export { sequelize, User };
