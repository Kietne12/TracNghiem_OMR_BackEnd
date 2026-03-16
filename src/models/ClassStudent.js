import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const LopSinhVien = sequelize.define("lop_sinh_vien", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  lop_id: {
    type: DataTypes.INTEGER,
  },

  sinh_vien_id: {
    type: DataTypes.INTEGER,
  },
});

export default LopSinhVien;