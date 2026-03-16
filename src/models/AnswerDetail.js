import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ChiTietBaiLam = sequelize.define("chi_tiet_bai_lam", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  bai_lam_id: {
    type: DataTypes.INTEGER,
  },

  cau_hoi_id: {
    type: DataTypes.INTEGER,
  },

  dap_an_chon: {
    type: DataTypes.STRING(1),
  },

  dung_sai: {
    type: DataTypes.BOOLEAN,
  },
});

export default ChiTietBaiLam;