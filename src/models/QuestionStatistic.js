import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ThongKeCauHoi = sequelize.define("thong_ke_cau_hoi", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  cau_hoi_id: {
    type: DataTypes.INTEGER,
  },

  ty_le_dung: {
    type: DataTypes.FLOAT,
  },
});

export default ThongKeCauHoi;