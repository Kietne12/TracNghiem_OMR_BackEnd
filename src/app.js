import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize } from "./models/index.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend running");
});

const PORT = process.env.PORT || 5000;

// Kiểm tra kết nối DB & đồng bộ models trước khi start server
const startServer = async () => {
  try {
    // Test kết nối
    await sequelize.authenticate();
    console.log("Kết nối MariaDB thành công!");

    // Đồng bộ tất cả models sang database (tương tự hibernate.hbm2ddl.auto = update)
    // alter: true  -> cập nhật bảng nếu model thay đổi (giữ dữ liệu)
    // force: true  -> xóa & tạo lại bảng (MẤT dữ liệu, chỉ dùng khi dev)
    await sequelize.sync({ alter: true });
    console.log("Đồng bộ models thành công!");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Không thể kết nối MariaDB:", error.message);
    process.exit(1);
  }
};

startServer();