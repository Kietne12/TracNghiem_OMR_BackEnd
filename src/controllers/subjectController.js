import { Op } from "sequelize";
import { Account, LopHoc, MonHoc, User } from "../models/index.js";

const includeAssignmentInfo = [
  {
    model: User,
    as: "giang_vien",
    attributes: ["id", "ho_ten", "email"],
    required: false,
    include: [
      {
        model: Account,
        as: "tai_khoan",
        attributes: ["username", "role"],
        required: false,
      },
    ],
  },
  {
    model: LopHoc,
    as: "lop_hoc",
    attributes: ["id", "ten_lop", "hoc_ky", "nam_hoc"],
    required: false,
  },
];

const isUniqueConstraintError = (error) => (
  error?.name === "SequelizeUniqueConstraintError"
  || error?.parent?.code === "ER_DUP_ENTRY"
  || error?.original?.code === "ER_DUP_ENTRY"
);

const toNullablePositiveInt = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
};

const duplicateTeacherMessage = "Giảng viên này đã được phân công lớp/môn khác. Mỗi giáo viên chỉ được phân công một lớp/môn.";

const validateSubjectAssignment = async ({ giang_vien_id, lop_id, subjectId = null }) => {
  if (giang_vien_id !== null) {
    if (Number.isNaN(giang_vien_id)) {
      return "Giảng viên không hợp lệ";
    }

    const teacher = await User.findByPk(giang_vien_id, {
      include: {
        model: Account,
        as: "tai_khoan",
        attributes: ["role"],
        required: true,
        where: { role: "giangvien" },
      },
    });

    if (!teacher) return "Không tìm thấy giảng viên";

    const existedSubject = await MonHoc.findOne({
      where: {
        giang_vien_id,
        ...(subjectId ? { id: { [Op.ne]: subjectId } } : {}),
      },
      attributes: ["id", "ten_mon_hoc", "lop_id"],
      include: {
        model: LopHoc,
        as: "lop_hoc",
        attributes: ["ten_lop"],
        required: false,
      },
    });

    if (existedSubject) {
      const className = existedSubject.lop_hoc?.ten_lop
        ? ` cho lớp ${existedSubject.lop_hoc.ten_lop}`
        : "";
      return `Giảng viên này đã được phân công môn ${existedSubject.ten_mon_hoc}${className}. Mỗi giáo viên chỉ được phân công một lớp/môn.`;
    }
  }

  if (lop_id !== null) {
    if (Number.isNaN(lop_id)) return "Lớp không hợp lệ";
    const lop = await LopHoc.findByPk(lop_id, { attributes: ["id"], raw: true });
    if (!lop) return "Không tìm thấy lớp";
  }

  return null;
};

export const getSubjects = async (_req, res) => {
  try {
    const data = await MonHoc.findAll({
      include: includeAssignmentInfo,
      order: [["id", "ASC"]],
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await MonHoc.findByPk(id, {
      include: includeAssignmentInfo,
    });

    if (!subject) {
      return res.status(404).json({ message: "Không tìm thấy môn học" });
    }

    return res.json(subject);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

export const createSubject = async (req, res) => {
  try {
    const ten_mon_hoc = typeof req.body.ten_mon_hoc === "string" ? req.body.ten_mon_hoc.trim() : "";
    const mo_ta = typeof req.body.mo_ta === "string" ? req.body.mo_ta : "";
    const giang_vien_id = toNullablePositiveInt(req.body.giang_vien_id);
    const lop_id = toNullablePositiveInt(req.body.lop_id);

    if (!ten_mon_hoc) {
      return res.status(400).json({ message: "Tên môn học không được để trống" });
    }

    const assignmentError = await validateSubjectAssignment({ giang_vien_id, lop_id });
    if (assignmentError) {
      return res.status(400).json({ message: assignmentError });
    }

    const subject = await MonHoc.create({
      ten_mon_hoc,
      mo_ta,
      giang_vien_id,
      lop_id,
    });

    return res.status(201).json(subject);
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(400).json({ message: duplicateTeacherMessage });
    }

    console.error(err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await MonHoc.findByPk(id);

    if (!subject) {
      return res.status(404).json({ message: "Không tìm thấy môn học" });
    }

    const ten_mon_hoc = typeof req.body.ten_mon_hoc === "string" ? req.body.ten_mon_hoc.trim() : "";
    const mo_ta = typeof req.body.mo_ta === "string" ? req.body.mo_ta : "";
    const giang_vien_id = toNullablePositiveInt(req.body.giang_vien_id);
    const lop_id = toNullablePositiveInt(req.body.lop_id);

    if (!ten_mon_hoc) {
      return res.status(400).json({ message: "Tên môn học không được để trống" });
    }

    const assignmentError = await validateSubjectAssignment({
      giang_vien_id,
      lop_id,
      subjectId: subject.id,
    });

    if (assignmentError) {
      return res.status(400).json({ message: assignmentError });
    }

    subject.ten_mon_hoc = ten_mon_hoc;
    subject.mo_ta = mo_ta;
    subject.giang_vien_id = giang_vien_id;
    subject.lop_id = lop_id;

    await subject.save();

    return res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(400).json({ message: duplicateTeacherMessage });
    }

    console.error(err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await MonHoc.findByPk(id);

    if (!subject) {
      return res.status(404).json({ message: "Không tìm thấy môn học" });
    }

    await subject.destroy();

    return res.json({ message: "Xóa thành công" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

export const getSubjectMeta = async (_req, res) => {
  try {
    const [teachers, classes] = await Promise.all([
      User.findAll({
        attributes: ["id", "ho_ten", "email"],
        include: [
          {
            model: Account,
            as: "tai_khoan",
            attributes: ["username", "role"],
            required: true,
            where: { role: "giangvien" },
          },
          {
            model: MonHoc,
            as: "mon_giang_day",
            attributes: ["id", "ten_mon_hoc"],
            required: false,
          },
        ],
        order: [["ho_ten", "ASC"]],
      }),
      LopHoc.findAll({
        where: { trang_thai: true },
        attributes: ["id", "ten_lop", "hoc_ky", "nam_hoc"],
        order: [["ten_lop", "ASC"]],
      }),
    ]);

    return res.json({ teachers, classes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};
