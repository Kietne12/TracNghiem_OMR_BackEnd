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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", verifyToken, dashboardRoutes);
app.use("/api/question-bank", verifyToken, questionBankGiangVienRoutes);
app.use("/api/exams", verifyToken, examRoutes);
app.use("/api/omr", omrRoutes);
app.use("/api/practice", practiceRoutes);

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

// Kiểm tra kết nối DB & đồng bộ models trước khi start server
const startServer = async () => {
  try {
    // Test kết nối
    await sequelize.authenticate();
    console.log("Kết nối MariaDB thành công!");

    // Đồng bộ các models với database.
    // fix: tránh lỗi MariaDB "Too many keys specified" khi tái tạo index qua alter.
    // Dùng sync() mặc định -> chỉ tạo bảng khi chưa có.
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