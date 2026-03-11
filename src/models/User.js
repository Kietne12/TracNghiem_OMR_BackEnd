import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import bcrypt from "bcrypt";

/**
 * Entity User — tương tự @Entity trong Hibernate
 * Sequelize sẽ tự động ánh xạ model này sang bảng "users" trong DB
 */
const User = sequelize.define(
  "users", // tên bảng
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ho_ten: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "Họ và tên",
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
      allowNull: true,
      unique: true,
      comment: "Mã số sinh viên",
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("admin", "giangvien", "sinhvien"),
      allowNull: false,
      defaultValue: "sinhvien",
    },
  },
  {
    // Hooks — tương tự @PrePersist / @PreUpdate trong Hibernate
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  }
);

/**
 * Instance method — so sánh mật khẩu
 * Sử dụng: await user.comparePassword("123456")
 */
User.prototype.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

/**
 * Instance method — trả về thông tin user không chứa password
 * Tương tự @JsonIgnore trong Java
 */
User.prototype.toSafeJSON = function () {
  const { password, ...safeUser } = this.toJSON();
  return safeUser;
};

export default User;
