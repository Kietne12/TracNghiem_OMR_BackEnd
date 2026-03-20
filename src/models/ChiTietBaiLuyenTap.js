import { DataTypes } from "sequelize";

export const ChiTietBaiLuyenTap = (sequelize) => {
  return sequelize.define("chi_tiet_bai_luyen_tap", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lich_su_bai_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "lich_su_bai_luyen_tap.id",
    },
    cau_hoi_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    dap_an_student: {
      type: DataTypes.CHAR(1),
      allowNull: true,
    },
    dap_an_dung: {
      type: DataTypes.CHAR(1),
      allowNull: false,
    },
    dung_sai: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
