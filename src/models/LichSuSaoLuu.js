import { DataTypes } from "sequelize"
import sequelize from "../config/database.js"

const LichSuSaoLuu = sequelize.define("lich_su_sao_luu", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    thoi_gian: DataTypes.STRING,
    dung_luong: DataTypes.STRING,

    // THÊM DÒNG NÀY
    ten_file: {
        type: DataTypes.STRING,
        allowNull: false
    }

}, {
    timestamps: false
})

export default LichSuSaoLuu