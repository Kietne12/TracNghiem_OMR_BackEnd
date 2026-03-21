import sequelize from "../config/database.js";

import User from "./User.js";
import MonHoc from "./Subject.js";
import CauHoi from "./Question.js";
import ThongKeKyThi from "./ExamStatistic.js";
import KyThi from "./Exam.js";
import FileOMR from "./OMRFile.js";
import KetQuaOMR from "./OMRResult.js";
import CauHoiKyThi from "./ExamQuestion.js";
import ChiTietBaiLam from "./AnswerDetail.js";
import LopHoc from "./Class.js";
import LopSinhVien from "./ClassStudent.js";
import BaiLam from "./ExamAttempt.js";
import ThongKeCauHoi from "./QuestionStatistic.js";
import Account from "./Account.js";
import CauHinhKyThi from "./ExamConfig.js";
import CaiDatHeThong from "./CaiDatHeThong.js";
import LichSuSaoLuu from "./LichSuSaoLuu.js";
import { BaiLuyenTap } from "./BaiLuyenTap.js";
import { LichSuBaiLuyenTap } from "./LichSuBaiLuyenTap.js";
import { ChiTietBaiLuyenTap } from "./ChiTietBaiLuyenTap.js";

const BaiLuyenTapModel = BaiLuyenTap(sequelize);
const LichSuBaiLuyenTapModel = LichSuBaiLuyenTap(sequelize);
const ChiTietBaiLuyenTapModel = ChiTietBaiLuyenTap(sequelize);

User.hasOne(Account, { foreignKey: "user_id", as: "tai_khoan" });
Account.belongsTo(User, { foreignKey: "user_id", as: "nguoi_dung" });

CauHoi.belongsTo(MonHoc, { foreignKey: "mon_hoc_id" });
KyThi.belongsTo(MonHoc, { foreignKey: "mon_hoc_id" });

BaiLam.belongsTo(KyThi, { foreignKey: "ky_thi_id", as: "ky_thi" });
KyThi.hasMany(BaiLam, { foreignKey: "ky_thi_id", as: "bai_lams" });

ChiTietBaiLam.belongsTo(BaiLam, { foreignKey: "bai_lam_id" });
ChiTietBaiLam.belongsTo(CauHoi, { foreignKey: "cau_hoi_id" });

CauHoiKyThi.belongsTo(KyThi, { foreignKey: "ky_thi_id" });
CauHoiKyThi.belongsTo(CauHoi, { foreignKey: "cau_hoi_id" });
KyThi.hasMany(CauHoiKyThi, { foreignKey: "ky_thi_id" });
CauHoi.hasMany(CauHoiKyThi, { foreignKey: "cau_hoi_id" });

KyThi.hasOne(CauHinhKyThi, { foreignKey: "ky_thi_id", as: "cau_hinh" });
CauHinhKyThi.belongsTo(KyThi, { foreignKey: "ky_thi_id" });

LopSinhVien.belongsTo(LopHoc, { foreignKey: "lop_id" });
LopSinhVien.belongsTo(User, { foreignKey: "sinh_vien_id" });
LopHoc.hasMany(LopSinhVien, { foreignKey: "lop_id" });
User.hasMany(LopSinhVien, { foreignKey: "sinh_vien_id" });

FileOMR.belongsTo(KyThi, { foreignKey: "ky_thi_id" });
KyThi.hasMany(FileOMR, { foreignKey: "ky_thi_id" });
KetQuaOMR.belongsTo(FileOMR, { foreignKey: "file_omr_id" });
KetQuaOMR.belongsTo(User, { foreignKey: "sinh_vien_id" });
FileOMR.hasMany(KetQuaOMR, { foreignKey: "file_omr_id" });
User.hasMany(KetQuaOMR, { foreignKey: "sinh_vien_id" });

ThongKeCauHoi.belongsTo(CauHoi, { foreignKey: "cau_hoi_id" });
CauHoi.hasOne(ThongKeCauHoi, { foreignKey: "cau_hoi_id" });
ThongKeKyThi.belongsTo(KyThi, { foreignKey: "ky_thi_id" });
KyThi.hasOne(ThongKeKyThi, { foreignKey: "ky_thi_id" });

BaiLuyenTapModel.hasMany(LichSuBaiLuyenTapModel, {
  foreignKey: "bai_luyen_tap_id",
  as: "lich_su",
});
LichSuBaiLuyenTapModel.belongsTo(BaiLuyenTapModel, {
  foreignKey: "bai_luyen_tap_id",
  as: "bai_luyen_tap",
});

LichSuBaiLuyenTapModel.hasMany(ChiTietBaiLuyenTapModel, {
  foreignKey: "lich_su_bai_id",
  as: "chi_tiet",
});
ChiTietBaiLuyenTapModel.belongsTo(LichSuBaiLuyenTapModel, {
  foreignKey: "lich_su_bai_id",
  as: "lich_su",
});

LichSuBaiLuyenTapModel.belongsTo(User, {
  foreignKey: "sinh_vien_id",
  as: "sinh_vien",
});
User.hasMany(LichSuBaiLuyenTapModel, {
  foreignKey: "sinh_vien_id",
  as: "lich_su_luyen_tap",
});

ChiTietBaiLuyenTapModel.belongsTo(CauHoi, {
  foreignKey: "cau_hoi_id",
  as: "cau_hoi",
});
CauHoi.hasMany(ChiTietBaiLuyenTapModel, {
  foreignKey: "cau_hoi_id",
  as: "chi_tiet_luyen_tap",
});

BaiLuyenTapModel.belongsTo(LopHoc, {
  foreignKey: "lop_id",
  as: "lop_hoc",
});
LopHoc.hasMany(BaiLuyenTapModel, {
  foreignKey: "lop_id",
  as: "bai_luyen_taps",
});

export {
  sequelize,
  User,
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
  Account,
  CauHinhKyThi,
  CaiDatHeThong,
  LichSuSaoLuu,
  BaiLuyenTapModel as BaiLuyenTap,
  LichSuBaiLuyenTapModel as LichSuBaiLuyenTap,
  ChiTietBaiLuyenTapModel as ChiTietBaiLuyenTap,
};
