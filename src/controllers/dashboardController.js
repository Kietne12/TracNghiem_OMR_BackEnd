import { Op, fn, col } from "sequelize";
import { Account, KyThi, CauHoi, BaiLam, MonHoc } from "../models/index.js";

const getRelativeTimeVi = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : null;
  if (!date || Number.isNaN(date.getTime())) return "Vừa xong";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ngày trước`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} tháng trước`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} năm trước`;
};

const getRoleLabelVi = (role) => {
  if (role === "admin") return "Admin";
  if (role === "giangvien") return "Giảng viên";
  return "Sinh viên";
};

export const getDashboard = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

    const [
      totalUsers,
      teachers,
      students,
      latestAccounts,
      latestSubjects,
    ] = await Promise.all([
      Account.count(),
      Account.count({ where: { role: "giangvien" } }),
      Account.count({ where: { role: "sinhvien" } }),
      Account.findAll({
        attributes: ["id", "role", "createdAt"],
        order: [["createdAt", "DESC"]],
        limit: 5,
      }),
      MonHoc.findAll({
        attributes: ["id", "createdAt"],
        order: [["createdAt", "DESC"]],
        limit: 5,
      }),
    ]);

    const recentActivities = [
      ...latestAccounts.map((item) => ({
        id: `account-${item.id}`,
        action: `Tạo tài khoản (${getRoleLabelVi(item.role)})`,
        user: getRoleLabelVi(item.role),
        createdAt: item.createdAt,
      })),
      ...latestSubjects.map((item) => ({
        id: `subject-${item.id}`,
        action: "Tạo môn học",
        user: "Admin",
        createdAt: item.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        action: item.action,
        user: item.user,
        time: getRelativeTimeVi(item.createdAt),
      }));

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
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

    const studentsCount = await Account.count({ where: { role: "sinhvien" } });

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
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

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
