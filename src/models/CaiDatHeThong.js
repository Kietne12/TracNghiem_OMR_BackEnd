import { DataTypes } from "sequelize"
import sequelize from "../config/database.js"

const CaiDatHeThong = sequelize.define("cai_dat_he_thong", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    thoi_gian_thi: DataTypes.INTEGER,
    so_cau_toi_da: DataTypes.INTEGER,
    dung_luong_upload: DataTypes.INTEGER,
    so_lan_dang_nhap: DataTypes.INTEGER,
    thoi_gian_phien: DataTypes.INTEGER,
    bat_doi_mat_khau: DataTypes.BOOLEAN,
}, {
    tableName: "cai_dat_he_thong",   // 🔥 fix tên bảng
    timestamps: false               // 🔥 QUAN TRỌNG
})

export default CaiDatHeThong