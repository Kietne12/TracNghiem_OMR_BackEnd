import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define("nguoi_dung", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  ho_ten: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },

  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },

  mssv: {
    type: DataTypes.STRING(20),
    unique: true,
  },

  trang_thai: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

export default User;