import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const LopHoc = sequelize.define("lop_hoc", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  ten_lop: {
    type: DataTypes.STRING(100),
  },

  mo_ta: {
    type: DataTypes.TEXT,
  },

  hoc_ky: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },

  nam_hoc: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },

  trang_thai: {
    type: DataTypes.BOOLEAN,
  },
});

export default LopHoc;