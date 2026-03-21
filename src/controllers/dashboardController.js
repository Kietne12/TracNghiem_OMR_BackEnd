import { Op, fn, col } from "sequelize";
import { Account, User, KyThi, CauHoi, BaiLam } from "../models/index.js";

export const getDashboard = async (req, res) => {
  try {
    const totalUsers = await Account.count();
    const teachers = await Account.count({ where: { role: "giangvien" } });
    const students = await Account.count({ where: { role: "sinhvien" } });

    const recentActivities = [
      { id: 1, action: "Tạo tài khoản", user: "Admin", time: "1 giờ trước" },
      { id: 2, action: "Tạo môn học", user: "Admin", time: "2 giờ trước" },
    ];

    res.json({
      totalUsers,
      teachers,
      students,
      recentActivities,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const studentsCount = await User.count({
      where: {
        mssv: {
          [Op.ne]: null,
        },
      },
    });

    const examsCreated = await KyThi.count();
    const questionsBank = await CauHoi.count();

    const avgScoreRow = await BaiLam.findOne({
      attributes: [[fn("AVG", col("tong_diem")), "avgScore"]],
      where: {
        tong_diem: {
          [Op.ne]: null,
        },
      },
      raw: true,
    });

    const avgClassScore = Number(avgScoreRow?.avgScore ?? 0).toFixed(2);

    return res.status(200).json({
      studentsCount,
      examsCreated,
      questionsBank,
      avgClassScore: Number(avgClassScore),
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return res.status(500).json({
      message: "Lỗi khi lấy thông tin thống kê",
    });
  }
};

export const getRecentExams = async (req, res) => {
  try {
    const examAttributes = ["id", "ten_ky_thi", "createdAt"];

    const exams = await KyThi.findAll({
      attributes: examAttributes,
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    const recentExams = await Promise.all(
      exams.map(async (exam) => {
        const submissions = await BaiLam.count({ where: { ky_thi_id: exam.id } });
        const graded = await BaiLam.count({
          where: {
            ky_thi_id: exam.id,
            tong_diem: {
              [Op.ne]: null,
            },
          },
        });

        return {
          id: exam.id,
          name: exam.ten_ky_thi,
          date: exam.createdAt
            ? new Date(exam.createdAt).toLocaleDateString("vi-VN")
            : "",
          submissions,
          graded,
        };
      })
    );

    return res.status(200).json({ recentExams });
  } catch (error) {
    console.error("getRecentExams error:", error);
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách kỳ thi gần đây",
    });
  }
};
