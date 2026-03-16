import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const MonHoc = sequelize.define("mon_hoc", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ten_mon_hoc: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  mo_ta: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

export default MonHoc;