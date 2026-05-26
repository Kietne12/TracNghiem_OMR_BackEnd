import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { DataTypes } from "sequelize";
import { Account, LopHoc, LopSinhVien, MonHoc, User, sequelize } from "./models/index.js";

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
    exposedHeaders: [
      "Content-Disposition",
      "Content-Type",
      "Content-Length",
      "X-Session-Token",
      "X-Session-Timeout-Minutes",
      "X-Session-Timeout-Ms",
    ],
  })
);
app.use(express.json({ limit: "5mb" }));
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
    const userColumns = await qi.describeTable("nguoi_dung");
    const accountColumns = await qi.describeTable("tai_khoan");

    if (!userColumns.avatar) {
      await qi.addColumn("nguoi_dung", "avatar", {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      });
      console.log("Da them cot nguoi_dung.avatar");
    }

    if (!deThiColumns.ma_de) {
      await qi.addColumn("de_thi", "ma_de", {
        type: DataTypes.STRING(20),
        allowNull: true,
      });
      console.log("Đã thêm cột de_thi.ma_de");
    }

    if (!accountColumns.must_change_password) {
      await qi.addColumn("tai_khoan", "must_change_password", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log("Da them cot tai_khoan.must_change_password");
    }

    if (!accountColumns.reset_code_hash) {
      await qi.addColumn("tai_khoan", "reset_code_hash", {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
      console.log("Da them cot tai_khoan.reset_code_hash");
    }

    if (!accountColumns.reset_code_expires_at) {
      await qi.addColumn("tai_khoan", "reset_code_expires_at", {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log("Da them cot tai_khoan.reset_code_expires_at");
    }

    const monHocColumns = await qi.describeTable("mon_hoc");
    if (!monHocColumns.giang_vien_id) {
      await qi.addColumn("mon_hoc", "giang_vien_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      console.log("Da them cot mon_hoc.giang_vien_id");
    }

    if (!monHocColumns.lop_id) {
      await qi.addColumn("mon_hoc", "lop_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      console.log("Da them cot mon_hoc.lop_id");
    }

    const monHocIndexes = await qi.showIndex("mon_hoc");
    if (!monHocIndexes.some((index) => index.name === "idx_mon_hoc_giang_vien_id")) {
      await qi.addIndex("mon_hoc", ["giang_vien_id"], {
        name: "idx_mon_hoc_giang_vien_id",
        unique: true,
      });
    }

    if (!monHocIndexes.some((index) => index.name === "idx_mon_hoc_lop_id")) {
      await qi.addIndex("mon_hoc", ["lop_id"], {
        name: "idx_mon_hoc_lop_id",
      });
    }

    await sequelize.query(`
      UPDATE bai_luyen_tap
      SET cau_hinh = JSON_SET(
        COALESCE(cau_hinh, JSON_OBJECT()),
        '$.tron_cau_hoi',
        false,
        '$.tron_dap_an',
        false
      )
    `);
  } catch (error) {
    console.warn("Canh bao dam bao schema:", error.message);
  }
};

const ensureAssignmentSeedData = async () => {
  try {
    const [k18Class] = await LopHoc.findOrCreate({
      where: { ten_lop: "CNTT-K18", hoc_ky: "1", nam_hoc: "2025-2026" },
      defaults: {
        mo_ta: "Lop cong nghe thong tin K18",
        trang_thai: true,
      },
    });

    const studentAccounts = await Account.findAll({
      where: { role: "sinhvien" },
      attributes: ["user_id"],
      raw: true,
    });

    for (const student of studentAccounts.slice(0, 3)) {
      await LopSinhVien.findOrCreate({
        where: {
          lop_id: k18Class.id,
          sinh_vien_id: student.user_id,
        },
        defaults: {
          lop_id: k18Class.id,
          sinh_vien_id: student.user_id,
        },
      });
    }

    const extraTeacherUser = await User.findOne({ where: { email: "gv.c@omr.com" } });
    if (!extraTeacherUser) {
      const createdTeacher = await User.create({
        ho_ten: "Giang vien C",
        email: "gv.c@omr.com",
        mssv: null,
        trang_thai: true,
      });

      await Account.create({
        user_id: createdTeacher.id,
        username: "giangvien_c",
        password: "123456",
        role: "giangvien",
      });
    }

    const teacherAccounts = await Account.findAll({
      where: { role: "giangvien" },
      attributes: ["user_id"],
      order: [["id", "ASC"]],
      raw: true,
    });

    const subjectDefaults = [
      { ten_mon_hoc: "Co so du lieu 2", mo_ta: "Mon hoc ve database 2" },
      { ten_mon_hoc: "Lap trinh Python 2", mo_ta: "Mon hoc lap trinh Python" },
      { ten_mon_hoc: "Lap trinh C", mo_ta: "Mon hoc lap trinh C" },
    ];

    let subjects = await MonHoc.findAll({ order: [["id", "ASC"]] });
    while (subjects.length < Math.min(teacherAccounts.length, subjectDefaults.length)) {
      const subjectInfo = subjectDefaults[subjects.length];
      await MonHoc.create({
        ten_mon_hoc: subjectInfo.ten_mon_hoc,
        mo_ta: subjectInfo.mo_ta,
        lop_id: k18Class.id,
      });
      subjects = await MonHoc.findAll({ order: [["id", "ASC"]] });
    }

    for (let index = 0; index < Math.min(teacherAccounts.length, subjects.length); index += 1) {
      const teacherUserId = teacherAccounts[index].user_id;
      const subject = subjects[index];
      const existedByTeacher = await MonHoc.findOne({
        where: { giang_vien_id: teacherUserId },
      });

      if (existedByTeacher && existedByTeacher.id !== subject.id) {
        await existedByTeacher.update({ lop_id: k18Class.id });
        continue;
      }

      await subject.update({
        giang_vien_id: teacherUserId,
        lop_id: k18Class.id,
      });
    }

    await MonHoc.update(
      { lop_id: k18Class.id },
      { where: { lop_id: null } }
    );
  } catch (error) {
    console.warn("Canh bao seed du lieu phan cong:", error.message);
  }
};

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Kết nối MariaDB thành công!");

    await sequelize.sync();
    console.log("Đồng bộ models thành công!");

    await ensureSchemaColumns();
    await ensureAssignmentSeedData();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Không thể kết nối MariaDB:", error.message);
    process.exit(1);
  }
};

startServer();
