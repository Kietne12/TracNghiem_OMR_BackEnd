import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const CauHinhKyThi = sequelize.define("cau_hinh_ky_thi", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  ky_thi_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },

  hoc_ky: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },

  nam_hoc: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },

  tong_so_cau: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
  },

  hinh_thuc_thi: {
    type: DataTypes.ENUM("online", "omr"),
    allowNull: false,
    defaultValue: "online",
  },

  cach_tao_de: {
    type: DataTypes.ENUM("manual", "auto"),
    allowNull: false,
    defaultValue: "auto",
  },

  tron_cau_hoi: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  tron_dap_an: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  so_ma_de: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },

  so_cau_de: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  so_cau_trung_binh: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  so_cau_kho: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  ds_chuong: {
    type: DataTypes.JSON,
    allowNull: true,
  },

  ds_cau_hoi_chon: {
    type: DataTypes.JSON,
    allowNull: true,
  },

  ma_de_data: {
    type: DataTypes.JSON,
    allowNull: true,
  },

  cho_phep_chinh_sua: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: "cau_hinh_ky_thi",
});

export default CauHinhKyThi;
