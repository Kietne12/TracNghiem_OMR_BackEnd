import { Op, ForeignKeyConstraintError } from "sequelize";
import { Account, CauHoi, MonHoc } from "../models/index.js";

const getTeacherUserId = async (accountId) => {
  const account = await Account.findByPk(accountId);
  if (!account) return null;
  return account.user_id;
};

const getAssignedSubjectForTeacher = async (teacherUserId) => {
  if (!teacherUserId) return null;
  return MonHoc.findOne({
    where: { giang_vien_id: teacherUserId },
    attributes: ["id", "ten_mon_hoc", "lop_id"],
    raw: true,
  });
};

const canTeacherAccessQuestion = (question, teacherUserId, assignedSubject) => (
  Number(question.nguoi_tao_id) === Number(teacherUserId) &&
  Number(question.mon_hoc_id) === Number(assignedSubject?.id)
);

const normalizeQuestionPayload = (body = {}) => {
  const doKho = Number(body.do_kho || 1);
  const chuong = Number(body.chuong || 1);
  const dapAnDung = String(body.dap_an_dung || "").trim().toUpperCase();

  return {
    noi_dung: body.noi_dung,
    dap_an_a: body.dap_an_a,
    dap_an_b: body.dap_an_b,
    dap_an_c: body.dap_an_c,
    dap_an_d: body.dap_an_d,
    dap_an_dung: dapAnDung,
    do_kho: doKho,
    chuong,
  };
};

const validateQuestionPayload = (payload) => {
  if (
    !payload.noi_dung ||
    !payload.dap_an_a ||
    !payload.dap_an_b ||
    !payload.dap_an_c ||
    !payload.dap_an_d ||
    !payload.dap_an_dung
  ) {
    return "Vui long nhap day du thong tin cau hoi";
  }

  if (!["A", "B", "C", "D"].includes(payload.dap_an_dung)) {
    return "Dap an dung phai la A/B/C/D";
  }

  if (!Number.isInteger(payload.do_kho) || payload.do_kho < 1 || payload.do_kho > 3) {
    return "Do kho phai la 1, 2 hoac 3";
  }

  if (!Number.isInteger(payload.chuong) || payload.chuong <= 0) {
    return "Chuong khong hop le";
  }

  return null;
};

export const getQuestionBank = async (req, res) => {
  try {
    const teacherUserId = await getTeacherUserId(req.user.id);
    if (!teacherUserId) {
      return res.status(401).json({ message: "Tai khoan khong hop le" });
    }

    const assignedSubject = await getAssignedSubjectForTeacher(teacherUserId);
    if (!assignedSubject) {
      return res.status(200).json({ questions: [], assignedSubject: null });
    }

    const { search, chapter, difficulty } = req.query;
    const whereClause = {
      nguoi_tao_id: teacherUserId,
      mon_hoc_id: assignedSubject.id,
    };

    if (search) {
      whereClause.noi_dung = {
        [Op.like]: `%${search}%`,
      };
    }

    if (chapter) whereClause.chuong = Number(chapter);
    if (difficulty) whereClause.do_kho = Number(difficulty);

    const questions = await CauHoi.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({ questions, assignedSubject });
  } catch (error) {
    console.error("getQuestionBank error:", error);
    res.status(500).json({ message: "Loi khi lay danh sach cau hoi" });
  }
};

export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await CauHoi.findByPk(id);
    if (!question) {
      return res.status(404).json({ message: "Khong tim thay cau hoi" });
    }

    const teacherUserId = await getTeacherUserId(req.user.id);
    const assignedSubject = await getAssignedSubjectForTeacher(teacherUserId);
    if (req.user.role !== "admin" && !canTeacherAccessQuestion(question, teacherUserId, assignedSubject)) {
      return res.status(403).json({ message: "Khong co quyen truy cap" });
    }

    res.status(200).json({ question });
  } catch (error) {
    console.error("getQuestionById error:", error);
    res.status(500).json({ message: "Loi khi lay cau hoi" });
  }
};

export const createQuestion = async (req, res) => {
  try {
    const teacherUserId = await getTeacherUserId(req.user.id);
    if (!teacherUserId) {
      return res.status(401).json({ message: "Tai khoan khong hop le" });
    }

    const assignedSubject = await getAssignedSubjectForTeacher(teacherUserId);
    if (!assignedSubject) {
      return res.status(400).json({ message: "Giang vien chua duoc phan cong mon hoc" });
    }

    const payload = normalizeQuestionPayload(req.body);
    const validationError = validateQuestionPayload(payload);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const question = await CauHoi.create({
      ...payload,
      mon_hoc_id: assignedSubject.id,
      nguoi_tao_id: teacherUserId,
    });

    res.status(201).json({ question });
  } catch (error) {
    console.error("createQuestion error:", error);

    if (error.name === "SequelizeValidationError" || error.name === "SequelizeDatabaseError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Loi khi tao cau hoi" });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await CauHoi.findByPk(id);
    if (!question) {
      return res.status(404).json({ message: "Khong tim thay cau hoi" });
    }

    const teacherUserId = await getTeacherUserId(req.user.id);
    const assignedSubject = await getAssignedSubjectForTeacher(teacherUserId);
    if (req.user.role !== "admin" && !canTeacherAccessQuestion(question, teacherUserId, assignedSubject)) {
      return res.status(403).json({ message: "Khong co quyen cap nhat cau hoi" });
    }

    const payload = normalizeQuestionPayload(req.body);
    const validationError = validateQuestionPayload(payload);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    await question.update({
      ...payload,
      mon_hoc_id: req.user.role === "admin" && req.body.mon_hoc_id
        ? Number(req.body.mon_hoc_id)
        : question.mon_hoc_id,
    });

    res.status(200).json({ question });
  } catch (error) {
    console.error("updateQuestion error:", error);
    res.status(500).json({ message: "Loi khi cap nhat cau hoi" });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await CauHoi.findByPk(id);
    if (!question) {
      return res.status(404).json({ message: "Khong tim thay cau hoi" });
    }

    const teacherUserId = await getTeacherUserId(req.user.id);
    const assignedSubject = await getAssignedSubjectForTeacher(teacherUserId);
    if (req.user.role !== "admin" && !canTeacherAccessQuestion(question, teacherUserId, assignedSubject)) {
      return res.status(403).json({ message: "Khong co quyen xoa cau hoi" });
    }

    await question.destroy();
    res.status(200).json({ message: "Xoa cau hoi thanh cong" });
  } catch (error) {
    console.error("deleteQuestion error:", error);
    if (error instanceof ForeignKeyConstraintError) {
      return res.status(409).json({ message: "Khong the xoa cau hoi dang duoc su dung trong ky thi" });
    }
    res.status(500).json({ message: "Loi khi xoa cau hoi" });
  }
};
