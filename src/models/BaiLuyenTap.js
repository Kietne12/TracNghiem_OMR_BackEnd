import { DataTypes } from "sequelize";

export const BaiLuyenTap = (sequelize) => {
  return sequelize.define("bai_luyen_tap", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mon_hoc_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    lop_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ten_bai: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mo_ta: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    so_cau: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    thoi_gian_lam_bai: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      comment: "phút",
    },
    cau_hinh: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        hoc_ky: null,
        nam_hoc: null,
        diem_toi_da: 10,
        tron_cau_hoi: false,
        tron_dap_an: false,
        cach_tao_de: "auto",
        tong_so_cau: 30,
        so_cau_de: 10,
        so_cau_trung_binh: 10,
        so_cau_kho: 10,
        cho_phep_lam_lai: true,
        cho_xem_chi_tiet: true,
        cho_xem_dap_an_dung: true,
        ds_chuong: [],
        ds_cau_hoi_chon: [],
      },
    },
    trang_thai: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });
};
