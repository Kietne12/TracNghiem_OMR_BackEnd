import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const CauHoi = sequelize.define("cau_hoi", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  mon_hoc_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  noi_dung: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  dap_an_a: DataTypes.STRING,
  dap_an_b: DataTypes.STRING,
  dap_an_c: DataTypes.STRING,
  dap_an_d: DataTypes.STRING,

  dap_an_dung: {
    type: DataTypes.STRING(1),
  },

  do_kho: {
    type: DataTypes.INTEGER,
  },

  chuong: {
    type: DataTypes.INTEGER,
  },
  nguoi_tao_id: {
    type: DataTypes.INTEGER,
  },
});

export default CauHoi;