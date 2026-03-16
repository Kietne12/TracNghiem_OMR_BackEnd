import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const BaiLam = sequelize.define("bai_lam", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  ky_thi_id: {
    type: DataTypes.INTEGER,
  },

  sinh_vien_id: {
    type: DataTypes.INTEGER,
  },

  thoi_gian_bat_dau: {
    type: DataTypes.DATE,
  },

  thoi_gian_nop: {
    type: DataTypes.DATE,
  },

  tong_diem: {
    type: DataTypes.FLOAT,
  },
});

export default BaiLam;