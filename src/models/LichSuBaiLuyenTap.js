import { DataTypes } from "sequelize";

export const LichSuBaiLuyenTap = (sequelize) => {
  return sequelize.define("lich_su_bai_luyen_tap", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bai_luyen_tap_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sinh_vien_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    thoi_gian_bat_dau: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    thoi_gian_nop: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tong_diem: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    trang_thai: {
      type: DataTypes.ENUM("dang_lam", "da_nop", "da_cham"),
      defaultValue: "dang_lam",
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });
};
