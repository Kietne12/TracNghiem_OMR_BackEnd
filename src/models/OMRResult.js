import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const KetQuaOMR = sequelize.define("ket_qua_omr", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  file_omr_id: {
    type: DataTypes.INTEGER,
  },

  sinh_vien_id: {
    type: DataTypes.INTEGER,
  },

  diem: {
    type: DataTypes.FLOAT,
  },
});

export default KetQuaOMR;