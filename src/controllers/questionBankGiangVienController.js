import { Op, ForeignKeyConstraintError } from "sequelize";
import { Account, CauHoi, MonHoc } from "../models/index.js";

const getTeacherUserId = async (accountId) => {
  const account = await Account.findByPk(accountId);
  if (!account) return null;
  return account.user_id;
};

export const getQuestionBank = async (req, res) => {
  try {
    const teacherUserId = await getTeacherUserId(req.user.id);
    if (!teacherUserId) {
      return res.status(401).json({ message: "Tài khoản không hợp lệ" });
    }

    const { search, chapter, difficulty } = req.query;
    const whereClause = {
      nguoi_tao_id: teacherUserId,
    };

    if (search) {
      whereClause.noi_dung = {
        [Op.like]: `%${search}%`,
      };
    }

    if (chapter) {
      whereClause.chuong = Number(chapter);
    }

    if (difficulty) {
      whereClause.do_kho = Number(difficulty);
    }

    const questions = await CauHoi.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({ questions });
  } catch (error) {
    console.error("getQuestionBank error:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách câu hỏi" });
  }
};

export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await CauHoi.findByPk(id);
    if (!question) {
      return res.status(404).json({ message: "Không tìm thấy câu hỏi" });
    }
    // Kiểm tra quyền kiểu giangvien cho nguoi_tao_id
    const teacherUserId = await getTeacherUserId(req.user.id);
    if (req.user.role !== "admin" && question.nguoi_tao_id !== teacherUserId) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }
    res.status(200).json({ question });
  } catch (error) {
    console.error("getQuestionById error:", error);
    res.status(500).json({ message: "Lỗi khi lấy câu hỏi" });
  }
};

export const createQuestion = async (req, res) => {
  try {
    const teacherUserId = await getTeacherUserId(req.user.id);
    if (!teacherUserId) {
      return res.status(401).json({ message: "Tài khoản không hợp lệ" });
    }

    console.log('createQuestion payload:', req.body);

    let { mon_hoc_id, noi_dung, dap_an_a, dap_an_b, dap_an_c, dap_an_d, dap_an_dung, do_kho, chuong } = req.body;

    if (!noi_dung || !dap_an_a || !dap_an_b || !dap_an_c || !dap_an_d || !dap_an_dung) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin câu hỏi" });
    }

    mon_hoc_id = Number(mon_hoc_id);
    do_kho = Number(do_kho || 1);
    chuong = Number(chuong || 1);
    dap_an_dung = String(dap_an_dung).trim().toUpperCase();

    if (!Number.isInteger(mon_hoc_id) || mon_hoc_id <= 0) {
      return res.status(400).json({ message: "mon_hoc_id không hợp lệ" });
    }

    if (!['A', 'B', 'C', 'D'].includes(dap_an_dung)) {
      return res.status(400).json({ message: "Đáp án đúng phải là A/B/C/D" });
    }

    if (do_kho < 1 || do_kho > 3 || !Number.isInteger(do_kho)) {
      return res.status(400).json({ message: "Độ khó phải là 1,2,3" });
    }

    if (!Number.isInteger(chuong) || chuong <= 0) {
      return res.status(400).json({ message: "Chương không hợp lệ" });
    }

    // Nếu mon_hoc_id không tồn tại, fallback về lần đầu tiên
    let validatedMonHocId = mon_hoc_id;
    let monHoc = await MonHoc.findByPk(mon_hoc_id);
    if (!monHoc) {
      monHoc = await MonHoc.findOne();
      if (!monHoc) {
        return res.status(400).json({ message: "Không tìm thấy môn học hợp lệ" });
      }
      validatedMonHocId = monHoc.id;
    }

    const question = await CauHoi.create({
      mon_hoc_id: validatedMonHocId,
      noi_dung,
      dap_an_a,
      dap_an_b,
      dap_an_c,
      dap_an_d,
      dap_an_dung,
      do_kho,
      chuong,
      nguoi_tao_id: teacherUserId,
    });

    res.status(201).json({ question });
  } catch (error) {
    console.error("createQuestion error:", error);

    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeDatabaseError') {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Lỗi khi tạo câu hỏi" });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { mon_hoc_id, noi_dung, dap_an_a, dap_an_b, dap_an_c, dap_an_d, dap_an_dung, do_kho, chuong } = req.body;

    const question = await CauHoi.findByPk(id);
    if (!question) return res.status(404).json({ message: "Không tìm thấy câu hỏi" });

    const teacherUserId = await getTeacherUserId(req.user.id);
    if (req.user.role !== "admin" && question.nguoi_tao_id !== teacherUserId) {
      return res.status(403).json({ message: "Không có quyền cập nhật câu hỏi" });
    }

    await question.update({
      mon_hoc_id,
      noi_dung,
      dap_an_a,
      dap_an_b,
      dap_an_c,
      dap_an_d,
      dap_an_dung,
      do_kho,
      chuong,
    });

    res.status(200).json({ question });
  } catch (error) {
    console.error("updateQuestion error:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật câu hỏi" });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await CauHoi.findByPk(id);
    if (!question) return res.status(404).json({ message: "Không tìm thấy câu hỏi" });

    const teacherUserId = await getTeacherUserId(req.user.id);
    if (req.user.role !== "admin" && question.nguoi_tao_id !== teacherUserId) {
      return res.status(403).json({ message: "Không có quyền xóa câu hỏi" });
    }

    await question.destroy();
    res.status(200).json({ message: "Xóa câu hỏi thành công" });
  } catch (error) {
    console.error("deleteQuestion error:", error);
    if (error instanceof ForeignKeyConstraintError) {
      return res.status(409).json({ message: "Không thể xóa câu hỏi đang được sử dụng trong kỳ thi" });
    }
    res.status(500).json({ message: "Lỗi khi xóa câu hỏi" });
  }
};
