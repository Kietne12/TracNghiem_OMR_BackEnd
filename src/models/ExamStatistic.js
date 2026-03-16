import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ThongKeKyThi = sequelize.define("thong_ke_ky_thi", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  ky_thi_id: {
    type: DataTypes.INTEGER,
  },

  diem_trung_binh: {
    type: DataTypes.FLOAT,
  },

  diem_cao_nhat: {
    type: DataTypes.FLOAT,
  },

  diem_thap_nhat: {
    type: DataTypes.FLOAT,
  },
});

export default ThongKeKyThi;