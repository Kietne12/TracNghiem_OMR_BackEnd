/**
 * Script seed toàn bộ dữ liệu mẫu
 * chạy: node src/scripts/seed.js
 */

import dotenv from "dotenv";
dotenv.config();

import {
  sequelize,
  User,
  Account,
  MonHoc,
  CauHoi,
  KyThi,
  BaiLam,
  ChiTietBaiLam,
  CauHoiKyThi,
  LopHoc,
  LopSinhVien,
  FileOMR,
  KetQuaOMR,
  ThongKeCauHoi,
  ThongKeKyThi,
} from "../models/index.js";

const seed = async () => {
  try {
    await sequelize.sync({ alter: true });

    console.log("Seeding database...");

    // ======================
    // USERS
    // ======================

    const admin = await User.create({
      ho_ten: "Admin",
      email: "admin@omr.com",
      mssv: null,
      trang_thai: true,
    });

    const gv = await User.create({
      ho_ten: "Nguyen Van A",
      email: "gv@omr.com",
      mssv: null,
      trang_thai: true,
    });

    const sv = await User.create({
      ho_ten: "Tran Van B",
      email: "sv@omr.com",
      mssv: "20110001",
      trang_thai: true,
    });

    // ======================
    // ACCOUNT
    // ======================

    await Account.create({
      user_id: admin.id,
      username: "admin",
      password: "123456",
      role: "admin",
    });

    await Account.create({
      user_id: gv.id,
      username: "giangvien",
      password: "123456",
      role: "giangvien",
    });

    await Account.create({
      user_id: sv.id,
      username: "sinhvien",
      password: "123456",
      role: "sinhvien",
    });

    // ======================
    // SUBJECT
    // ======================

    const mon1 = await MonHoc.create({
      ten_mon_hoc: "Cơ sở dữ liệu",
      mo_ta: "Môn học về database",
    });

    // ======================
    // CLASS
    // ======================

    const lop = await LopHoc.create({
      ten_lop: "CNTT-K18",
      mo_ta: "Lớp công nghệ thông tin",
      trang_thai: true,
    });

    // ======================
    // CLASS STUDENT
    // ======================

    await LopSinhVien.create({
      lop_id: lop.id,
      sinh_vien_id: sv.id,
    });

    // ======================
    // QUESTION
    // ======================

    const q1 = await CauHoi.create({
      mon_hoc_id: mon1.id,
      noi_dung: "SQL viết tắt của gì?",
      dap_an_a: "Structured Query Language",
      dap_an_b: "Simple Query Language",
      dap_an_c: "Standard Question Language",
      dap_an_d: "None",
      dap_an_dung: "A",
      do_kho: 1,
      chuong: 1,
      trang_thai: true,
      nguoi_tao_id: gv.id,
    });

    const q2 = await CauHoi.create({
      mon_hoc_id: mon1.id,
      noi_dung: "SELECT dùng để làm gì?",
      dap_an_a: "Xóa dữ liệu",
      dap_an_b: "Truy vấn dữ liệu",
      dap_an_c: "Thêm dữ liệu",
      dap_an_d: "Cập nhật dữ liệu",
      dap_an_dung: "B",
      do_kho: 1,
      chuong: 1,
      trang_thai: true,
      nguoi_tao_id: gv.id,
    });

    // ======================
    // EXAM
    // ======================

    const exam = await KyThi.create({
      ten_ky_thi: "Giữa kỳ CSDL",
      mon_hoc_id: mon1.id,
      lop_id: lop.id,
      thoi_gian_lam_bai: 60,
      thoi_gian_bat_dau: new Date(),
      thoi_gian_ket_thuc: new Date(),
      trang_thai: "open",
    });

    // ======================
    // EXAM QUESTION
    // ======================

    await CauHoiKyThi.create({
      ky_thi_id: exam.id,
      cau_hoi_id: q1.id,
    });

    await CauHoiKyThi.create({
      ky_thi_id: exam.id,
      cau_hoi_id: q2.id,
    });

    // ======================
    // EXAM ATTEMPT
    // ======================

    const baiLam = await BaiLam.create({
      ky_thi_id: exam.id,
      sinh_vien_id: sv.id,
      thoi_gian_bat_dau: new Date(),
      thoi_gian_nop: new Date(),
      tong_diem: 10,
    });

    // ======================
    // ANSWER DETAIL
    // ======================

    await ChiTietBaiLam.create({
      bai_lam_id: baiLam.id,
      cau_hoi_id: q1.id,
      dap_an_chon: "A",
      dung_sai: true,
    });

    await ChiTietBaiLam.create({
      bai_lam_id: baiLam.id,
      cau_hoi_id: q2.id,
      dap_an_chon: "B",
      dung_sai: true,
    });

    // ======================
    // OMR FILE
    // ======================

    const file = await FileOMR.create({
      ky_thi_id: exam.id,
      ten_file: "omr_scan_1.png",
      duong_dan: "/uploads/omr_scan_1.png",
      ngay_tai_len: new Date(),
    });

    // ======================
    // OMR RESULT
    // ======================

    await KetQuaOMR.create({
      file_omr_id: file.id,
      sinh_vien_id: sv.id,
      diem: 9,
    });

    // ======================
    // QUESTION STATISTIC
    // ======================

    await ThongKeCauHoi.create({
      cau_hoi_id: q1.id,
      ty_le_dung: 0.9,
    });

    // ======================
    // EXAM STATISTIC
    // ======================

    await ThongKeKyThi.create({
      ky_thi_id: exam.id,
      diem_trung_binh: 8,
      diem_cao_nhat: 10,
      diem_thap_nhat: 6,
    });

    console.log("Seed thành công!");
    process.exit();
  } catch (error) {
    console.error("Seed lỗi:", error);
    process.exit(1);
  }
};

seed();