import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { DataTypes } from "sequelize";
import { sequelize } from "./models/index.js";

import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import questionBankGiangVienRoutes from "./routes/questionBankGiangVienRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import omrRoutes from "./routes/omrRoutes.js";
import practiceRoutes from "./routes/practiceRoutes.js";
import { verifyToken } from "./middlewares/authMiddleware.js";
import accountRoutes from "./routes/accountRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import heThongRoutes from "./routes/heThongRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    exposedHeaders: ["Content-Disposition", "Content-Type", "Content-Length"],
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));
// Cho phép truy cập các trang demo tĩnh (UI test nhanh ngay trong backend)
app.use("/demo", express.static(path.resolve("public")));

// =======================
// ROUTES
// =======================

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", verifyToken, dashboardRoutes);
app.use("/api/question-bank", verifyToken, questionBankGiangVienRoutes);
app.use("/api/exams", verifyToken, examRoutes);
app.use("/api/omr", omrRoutes);
app.use("/api/practice", practiceRoutes);

// 🔥 THÊM DÒNG NÀY
app.use("/api/admin/accounts", accountRoutes);
app.use("/api/admin/subjects", subjectRoutes);
app.use("/api/admin/system", heThongRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.send("Backend running");
});

const PORT = process.env.PORT || 5000;

const ensureSchemaColumns = async () => {
  try {
    const qi = sequelize.getQueryInterface();
    const deThiColumns = await qi.describeTable("de_thi");

    if (!deThiColumns.ma_de) {
      await qi.addColumn("de_thi", "ma_de", {
        type: DataTypes.STRING(20),
        allowNull: true,
      });
      console.log("Đã thêm cột de_thi.ma_de");
    }
  } catch (error) {
    console.warn("Cảnh báo đảm bảo schema de_thi.ma_de:", error.message);
  }
};

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Kết nối MariaDB thành công!");

    await sequelize.sync();
    console.log("Đồng bộ models thành công!");

    await ensureSchemaColumns();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Không thể kết nối MariaDB:", error.message);
    process.exit(1);
  }
};

startServer();