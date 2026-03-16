import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const FileOMR = sequelize.define("file_omr", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  ky_thi_id: {
    type: DataTypes.INTEGER,
  },

  ten_file: {
    type: DataTypes.STRING,
  },

  duong_dan: {
    type: DataTypes.STRING,
  },

  ngay_tai_len: {
    type: DataTypes.DATE,
  },
});

export default FileOMR;