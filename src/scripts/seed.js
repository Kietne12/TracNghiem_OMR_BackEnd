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
    await sequelize.authenticate();

    await sequelize.query(
      "ALTER TABLE lop_hoc ADD COLUMN IF NOT EXISTS hoc_ky VARCHAR(20) NULL"
    );
    await sequelize.query(
      "ALTER TABLE lop_hoc ADD COLUMN IF NOT EXISTS nam_hoc VARCHAR(20) NULL"
    );

    await sequelize.sync();

    console.log("Seeding database...");

    // ======================
    // USERS
    // ======================

    const [admin] = await User.findOrCreate({
      where: { email: "admin@omr.com" },
      defaults: {
        ho_ten: "Admin",
        email: "admin@omr.com",
        mssv: null,
        trang_thai: true,
      },
    });

    await admin.update({
      ho_ten: "Admin",
      mssv: null,
      trang_thai: true,
    });

    const [gv] = await User.findOrCreate({
      where: { email: "gv@omr.com" },
      defaults: {
        ho_ten: "Nguyen Van A",
        email: "gv@omr.com",
        mssv: null,
        trang_thai: true,
      },
    });

    await gv.update({
      ho_ten: "Nguyen Van A",
      mssv: null,
      trang_thai: true,
    });

    const [sv] = await User.findOrCreate({
      where: { email: "sv@omr.com" },
      defaults: {
        ho_ten: "Tran Van B",
        email: "sv@omr.com",
        mssv: "00001",
        trang_thai: true,
      },
    });

    await sv.update({
      ho_ten: "Tran Van B",
      mssv: "20110001",
      trang_thai: true,
    });

    // ======================
    // ACCOUNT
    // ======================

    const upsertAccount = async ({ user_id, username, role }) => {
      const [account] = await Account.findOrCreate({
        where: { username },
        defaults: {
          user_id,
          username,
          password: "123456",
          role,
        },
      });

      await account.update({
        user_id,
        role,
        password: "123456",
      });
    };

    await upsertAccount({ user_id: admin.id, username: "admin", role: "admin" });
    await upsertAccount({ user_id: gv.id, username: "giangvien", role: "giangvien" });
    await upsertAccount({ user_id: sv.id, username: "sinhvien", role: "sinhvien" });

    // ======================
    // SUBJECT
    // ======================

    const [mon1] = await MonHoc.findOrCreate({
      where: { ten_mon_hoc: "Cơ sở dữ liệu" },
      defaults: {
        ten_mon_hoc: "Cơ sở dữ liệu",
        mo_ta: "Môn học về database",
      },
    });

    await mon1.update({ mo_ta: "Môn học về database" });

    // ======================
    // CLASS
    // ======================

    const [lopKy1] = await LopHoc.findOrCreate({
      where: {
        ten_lop: "CNTT-K18",
        hoc_ky: "1",
        nam_hoc: "2025-2026",
      },
      defaults: {
        ten_lop: "CNTT-K18",
        mo_ta: "Lớp công nghệ thông tin - kỳ 1",
        hoc_ky: "1",
        nam_hoc: "2025-2026",
        trang_thai: true,
      },
    });

    await lopKy1.update({
      mo_ta: "Lớp công nghệ thông tin - kỳ 1",
      hoc_ky: "1",
      nam_hoc: "2025-2026",
      trang_thai: true,
    });

    const [lopKy2] = await LopHoc.findOrCreate({
      where: {
        ten_lop: "CNTT-K18",
        hoc_ky: "2",
        nam_hoc: "2025-2026",
      },
      defaults: {
        ten_lop: "CNTT-K18",
        mo_ta: "Lớp công nghệ thông tin - kỳ 2",
        hoc_ky: "2",
        nam_hoc: "2025-2026",
        trang_thai: true,
      },
    });

    await lopKy2.update({
      mo_ta: "Lớp công nghệ thông tin - kỳ 2",
      hoc_ky: "2",
      nam_hoc: "2025-2026",
      trang_thai: true,
    });

    // ======================
    // CLASS STUDENT
    // ======================

    await LopSinhVien.findOrCreate({
      where: {
        lop_id: lopKy1.id,
        sinh_vien_id: sv.id,
      },
      defaults: {
        lop_id: lopKy1.id,
        sinh_vien_id: sv.id,
      },
    });

    // ======================
    // QUESTION
    // ======================

    const [q1] = await CauHoi.findOrCreate({
      where: {
        mon_hoc_id: mon1.id,
        noi_dung: "SQL viết tắt của gì?",
        nguoi_tao_id: gv.id,
      },
      defaults: {
        mon_hoc_id: mon1.id,
        noi_dung: "SQL viết tắt của gì?",
        dap_an_a: "Structured Query Language",
        dap_an_b: "Simple Query Language",
        dap_an_c: "Standard Question Language",
        dap_an_d: "None",
        dap_an_dung: "A",
        do_kho: 1,
        chuong: 1,
        nguoi_tao_id: gv.id,
      },
    });

    await q1.update({
      dap_an_a: "Structured Query Language",
      dap_an_b: "Simple Query Language",
      dap_an_c: "Standard Question Language",
      dap_an_d: "None",
      dap_an_dung: "A",
      do_kho: 1,
      chuong: 1,
      nguoi_tao_id: gv.id,
    });

    const [q2] = await CauHoi.findOrCreate({
      where: {
        mon_hoc_id: mon1.id,
        noi_dung: "SELECT dùng để làm gì?",
        nguoi_tao_id: gv.id,
      },
      defaults: {
        mon_hoc_id: mon1.id,
        noi_dung: "SELECT dùng để làm gì?",
        dap_an_a: "Xóa dữ liệu",
        dap_an_b: "Truy vấn dữ liệu",
        dap_an_c: "Thêm dữ liệu",
        dap_an_d: "Cập nhật dữ liệu",
        dap_an_dung: "B",
        do_kho: 1,
        chuong: 1,
        nguoi_tao_id: gv.id,
      },
    });

    await q2.update({
      dap_an_a: "Xóa dữ liệu",
      dap_an_b: "Truy vấn dữ liệu",
      dap_an_c: "Thêm dữ liệu",
      dap_an_d: "Cập nhật dữ liệu",
      dap_an_dung: "B",
      do_kho: 1,
      chuong: 1,
      nguoi_tao_id: gv.id,
    });

    // ======================
    // EXAM
    // ======================

    const [exam] = await KyThi.findOrCreate({
      where: {
        ten_ky_thi: "Giữa kỳ CSDL",
        mon_hoc_id: mon1.id,
        lop_id: lopKy1.id,
      },
      defaults: {
        ten_ky_thi: "Giữa kỳ CSDL",
        mon_hoc_id: mon1.id,
        lop_id: lopKy1.id,
        thoi_gian_lam_bai: 60,
        thoi_gian_bat_dau: new Date(),
        thoi_gian_ket_thuc: new Date(),
        trang_thai: "open",
      },
    });

    await exam.update({
      thoi_gian_lam_bai: 60,
      trang_thai: "open",
    });

    // ======================
    // EXAM QUESTION
    // ======================

    await CauHoiKyThi.findOrCreate({
      where: {
        ky_thi_id: exam.id,
        cau_hoi_id: q1.id,
      },
      defaults: {
        ky_thi_id: exam.id,
        cau_hoi_id: q1.id,
      },
    });

    await CauHoiKyThi.findOrCreate({
      where: {
        ky_thi_id: exam.id,
        cau_hoi_id: q2.id,
      },
      defaults: {
        ky_thi_id: exam.id,
        cau_hoi_id: q2.id,
      },
    });

    // ======================
    // EXAM ATTEMPT
    // ======================

    const [baiLam] = await BaiLam.findOrCreate({
      where: {
        ky_thi_id: exam.id,
        sinh_vien_id: sv.id,
      },
      defaults: {
        ky_thi_id: exam.id,
        sinh_vien_id: sv.id,
        thoi_gian_bat_dau: new Date(),
        thoi_gian_nop: new Date(),
        tong_diem: 10,
      },
    });

    await baiLam.update({
      thoi_gian_nop: new Date(),
      tong_diem: 10,
    });

    // ======================
    // ANSWER DETAIL
    // ======================

    await ChiTietBaiLam.findOrCreate({
      where: {
        bai_lam_id: baiLam.id,
        cau_hoi_id: q1.id,
      },
      defaults: {
        bai_lam_id: baiLam.id,
        cau_hoi_id: q1.id,
        dap_an_chon: "A",
        dung_sai: true,
      },
    });

    await ChiTietBaiLam.findOrCreate({
      where: {
        bai_lam_id: baiLam.id,
        cau_hoi_id: q2.id,
      },
      defaults: {
        bai_lam_id: baiLam.id,
        cau_hoi_id: q2.id,
        dap_an_chon: "B",
        dung_sai: true,
      },
    });

    // ======================
    // OMR FILE
    // ======================

    const [file] = await FileOMR.findOrCreate({
      where: {
        ky_thi_id: exam.id,
        ten_file: "omr_scan_1.png",
      },
      defaults: {
        ky_thi_id: exam.id,
        ten_file: "omr_scan_1.png",
        duong_dan: "/uploads/omr_scan_1.png",
        ngay_tai_len: new Date(),
      },
    });

    await file.update({
      duong_dan: "/uploads/omr_scan_1.png",
      ngay_tai_len: new Date(),
    });

    // ======================
    // OMR RESULT
    // ======================

    const [ketQua] = await KetQuaOMR.findOrCreate({
      where: {
        file_omr_id: file.id,
        sinh_vien_id: sv.id,
      },
      defaults: {
        file_omr_id: file.id,
        sinh_vien_id: sv.id,
        diem: 9,
      },
    });

    await ketQua.update({ diem: 9 });

    // ======================
    // QUESTION STATISTIC
    // ======================

    const [thongKeQ1] = await ThongKeCauHoi.findOrCreate({
      where: { cau_hoi_id: q1.id },
      defaults: {
        cau_hoi_id: q1.id,
        ty_le_dung: 0.9,
      },
    });

    await thongKeQ1.update({ ty_le_dung: 0.9 });

    // ======================
    // EXAM STATISTIC
    // ======================

    const [thongKeKyThi] = await ThongKeKyThi.findOrCreate({
      where: { ky_thi_id: exam.id },
      defaults: {
        ky_thi_id: exam.id,
        diem_trung_binh: 8,
        diem_cao_nhat: 10,
        diem_thap_nhat: 6,
      },
    });

    await thongKeKyThi.update({
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