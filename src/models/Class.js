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

  trang_thai: {
    type: DataTypes.BOOLEAN,
  },
});

export default LopHoc;