import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const KyThi = sequelize.define("ky_thi", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  ten_ky_thi: {
    type: DataTypes.STRING(200),
  },

  mon_hoc_id: {
    type: DataTypes.INTEGER,
  },

  lop_id: {
    type: DataTypes.INTEGER,
  },

  thoi_gian_lam_bai: {
    type: DataTypes.INTEGER,
  },

  thoi_gian_bat_dau: {
    type: DataTypes.DATE,
  },

  thoi_gian_ket_thuc: {
    type: DataTypes.DATE,
  },

  trang_thai: {
    type: DataTypes.STRING(50),
  },
});

export default KyThi;