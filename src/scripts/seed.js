/**
 * Script seed toan bo du lieu mau
 * chay: node src/scripts/seed.js
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
  CaiDatHeThong,
  LichSuSaoLuu,
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
    await sequelize.query(
      "ALTER TABLE tai_khoan ADD COLUMN IF NOT EXISTS so_lan_sai INT NOT NULL DEFAULT 0"
    );

    await sequelize.sync();

    console.log("Seeding database...");

    const [admin] = await User.findOrCreate({
      where: { email: "admin@omr.com" },
      defaults: {
        ho_ten: "Admin",
        email: "admin@omr.com",
        mssv: null,
        trang_thai: true,
      },
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

    const [sv] = await User.findOrCreate({
      where: { email: "sv@omr.com" },
      defaults: {
        ho_ten: "Tran Van B",
        email: "sv@omr.com",
        mssv: "20110001",
        trang_thai: true,
      },
    });

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

    const [mon1] = await MonHoc.findOrCreate({
      where: { ten_mon_hoc: "Co so du lieu" },
      defaults: {
        ten_mon_hoc: "Co so du lieu",
        mo_ta: "Mon hoc ve database",
      },
    });

    const [lopKy1] = await LopHoc.findOrCreate({
      where: {
        ten_lop: "CNTT-K18",
        hoc_ky: "1",
        nam_hoc: "2025-2026",
      },
      defaults: {
        ten_lop: "CNTT-K18",
        mo_ta: "Lop CNTT - ky 1",
        hoc_ky: "1",
        nam_hoc: "2025-2026",
        trang_thai: true,
      },
    });

    await LopHoc.findOrCreate({
      where: {
        ten_lop: "CNTT-K18",
        hoc_ky: "2",
        nam_hoc: "2025-2026",
      },
      defaults: {
        ten_lop: "CNTT-K18",
        mo_ta: "Lop CNTT - ky 2",
        hoc_ky: "2",
        nam_hoc: "2025-2026",
        trang_thai: true,
      },
    });

    await LopSinhVien.findOrCreate({
      where: { lop_id: lopKy1.id, sinh_vien_id: sv.id },
      defaults: { lop_id: lopKy1.id, sinh_vien_id: sv.id },
    });

    const [q1] = await CauHoi.findOrCreate({
      where: {
        mon_hoc_id: mon1.id,
        noi_dung: "SQL viet tat cua gi?",
        nguoi_tao_id: gv.id,
      },
      defaults: {
        mon_hoc_id: mon1.id,
        noi_dung: "SQL viet tat cua gi?",
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

    const [q2] = await CauHoi.findOrCreate({
      where: {
        mon_hoc_id: mon1.id,
        noi_dung: "SELECT dung de lam gi?",
        nguoi_tao_id: gv.id,
      },
      defaults: {
        mon_hoc_id: mon1.id,
        noi_dung: "SELECT dung de lam gi?",
        dap_an_a: "Xoa du lieu",
        dap_an_b: "Truy van du lieu",
        dap_an_c: "Them du lieu",
        dap_an_d: "Cap nhat du lieu",
        dap_an_dung: "B",
        do_kho: 1,
        chuong: 1,
        nguoi_tao_id: gv.id,
      },
    });

    const [exam] = await KyThi.findOrCreate({
      where: {
        ten_ky_thi: "Giua ky CSDL",
        mon_hoc_id: mon1.id,
        lop_id: lopKy1.id,
      },
      defaults: {
        ten_ky_thi: "Giua ky CSDL",
        mon_hoc_id: mon1.id,
        lop_id: lopKy1.id,
        thoi_gian_lam_bai: 60,
        thoi_gian_bat_dau: new Date(),
        thoi_gian_ket_thuc: new Date(),
        trang_thai: "open",
      },
    });

    await CauHoiKyThi.findOrCreate({
      where: { ky_thi_id: exam.id, cau_hoi_id: q1.id },
      defaults: { ky_thi_id: exam.id, cau_hoi_id: q1.id },
    });

    await CauHoiKyThi.findOrCreate({
      where: { ky_thi_id: exam.id, cau_hoi_id: q2.id },
      defaults: { ky_thi_id: exam.id, cau_hoi_id: q2.id },
    });

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

    await ChiTietBaiLam.findOrCreate({
      where: { bai_lam_id: baiLam.id, cau_hoi_id: q1.id },
      defaults: {
        bai_lam_id: baiLam.id,
        cau_hoi_id: q1.id,
        dap_an_chon: "A",
        dung_sai: true,
      },
    });

    await ChiTietBaiLam.findOrCreate({
      where: { bai_lam_id: baiLam.id, cau_hoi_id: q2.id },
      defaults: {
        bai_lam_id: baiLam.id,
        cau_hoi_id: q2.id,
        dap_an_chon: "B",
        dung_sai: true,
      },
    });

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

    await KetQuaOMR.findOrCreate({
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

    await ThongKeCauHoi.findOrCreate({
      where: { cau_hoi_id: q1.id },
      defaults: {
        cau_hoi_id: q1.id,
        ty_le_dung: 0.9,
      },
    });

    await ThongKeKyThi.findOrCreate({
      where: { ky_thi_id: exam.id },
      defaults: {
        ky_thi_id: exam.id,
        diem_trung_binh: 8,
        diem_cao_nhat: 10,
        diem_thap_nhat: 6,
      },
    });

    await CaiDatHeThong.findOrCreate({
      where: { id: 1 },
      defaults: {
        thoi_gian_thi: 300,
        so_cau_toi_da: 500,
        dung_luong_upload: 50,
        so_lan_dang_nhap: 5,
        thoi_gian_phien: 30,
        bat_doi_mat_khau: false,
      },
    });

    await LichSuSaoLuu.findOrCreate({
      where: { id: 1 },
      defaults: {
        thoi_gian: new Date().toLocaleString(),
        dung_luong: "10MB",
        ten_file: "seed-backup.sql",
      },
    });

    console.log("Seed thanh cong");
    process.exit();
  } catch (error) {
    console.error("Seed loi:", error);
    process.exit(1);
  }
};

seed();
