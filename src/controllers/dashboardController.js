import { Op, fn, col } from "sequelize";
import { Account, KyThi, CauHoi, BaiLam, MonHoc, LopHoc, User } from "../models/index.js";

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

const getTeacherSubjectWhere = async (req) => {
  if (req.user?.role !== "giangvien") return {};

  const account = await Account.findByPk(req.user.id, { attributes: ["user_id"], raw: true });
  if (!account?.user_id) return { mon_hoc_id: -1 };

  const subject = await MonHoc.findOne({
    where: { giang_vien_id: account.user_id },
    attributes: ["id"],
    raw: true,
  });

  return subject ? { mon_hoc_id: subject.id } : { mon_hoc_id: -1 };
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

    let assignedSubject = null;
    if (req.user?.role === "giangvien") {
      const account = await Account.findByPk(req.user.id, { attributes: ["user_id"], raw: true });
      if (account?.user_id) {
        const subject = await MonHoc.findOne({
          where: { giang_vien_id: account.user_id },
          attributes: ["id", "ten_mon_hoc", "lop_id"],
          include: [
            {
              model: User,
              as: "giang_vien",
              attributes: ["id", "ho_ten"],
              required: false,
            },
            {
              model: LopHoc,
              as: "lop_hoc",
              attributes: ["id", "ten_lop", "hoc_ky", "nam_hoc"],
              required: false,
            },
          ],
        });

        assignedSubject = subject ? subject.toJSON() : null;
      }
    }

    const teacherSubjectWhere = await getTeacherSubjectWhere(req);
    const examRowsForStats = Object.keys(teacherSubjectWhere).length > 0
      ? await KyThi.findAll({ where: teacherSubjectWhere, attributes: ["id"], raw: true })
      : [];
    const examIdsForStats = examRowsForStats.map((item) => item.id);

    const studentsCount = await Account.count({ where: { role: "sinhvien" } });

    const examsCreated = await KyThi.count({ where: teacherSubjectWhere });
    const questionsBank = await CauHoi.count({
      where: assignedSubject ? { mon_hoc_id: assignedSubject.id } : {},
    });

    const avgScoreRow = await BaiLam.findOne({
      attributes: [[fn("AVG", col("tong_diem")), "avgScore"]],
      where: {
        tong_diem: {
          [Op.ne]: null,
        },
        ...(Object.keys(teacherSubjectWhere).length > 0
          ? { ky_thi_id: { [Op.in]: examIdsForStats.length > 0 ? examIdsForStats : [-1] } }
          : {}),
      },
      raw: true,
    });

    const avgClassScore = Number(avgScoreRow?.avgScore ?? 0).toFixed(2);

    return res.status(200).json({
      studentsCount,
      examsCreated,
      questionsBank,
      avgClassScore: Number(avgClassScore),
      assignedSubject,
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
    const teacherSubjectWhere = await getTeacherSubjectWhere(req);

    const exams = await KyThi.findAll({
      attributes: examAttributes,
      where: teacherSubjectWhere,
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
