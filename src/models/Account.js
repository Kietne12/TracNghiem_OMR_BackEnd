import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import bcrypt from "bcrypt";

const Account = sequelize.define(
  "tai_khoan",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    username: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
    },

    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    role: {
      type: DataTypes.ENUM("admin", "giangvien", "sinhvien"),
      defaultValue: "sinhvien",
    },
  },
  {
    hooks: {
      beforeCreate: async (account) => {
        if (account.password) {
          account.password = await bcrypt.hash(account.password, 10);
        }
      },

      beforeUpdate: async (account) => {
        if (account.changed("password")) {
          account.password = await bcrypt.hash(account.password, 10);
        }
      },
    },
  }
);

Account.prototype.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

export default Account;