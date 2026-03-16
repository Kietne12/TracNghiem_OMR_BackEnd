import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const DeThi = sequelize.define("de_thi", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  ky_thi_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  cau_hoi_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

export default DeThi;