import { Op } from "sequelize";
import {
  Account,
  BaiLuyenTap,
  LichSuBaiLuyenTap,
  ChiTietBaiLuyenTap,
  CauHoi,
  LopHoc,
  LopSinhVien,
  User,
} from "../models/index.js";

const toPositiveInt = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (Number.isNaN(value)) return fallback;
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  }

  return fallback;
};

const uniqueNumberArray = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))];
};

const shuffleArray = (arr) => {
  const cloned = [...arr];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
};

const pickRandom = (arr, count) => shuffleArray(arr).slice(0, Math.max(0, count));

const getUserIdFromAccount = async (accountId) => {
  if (!accountId) return null;
  const account = await Account.findByPk(accountId, { raw: true });
  return account?.user_id || null;
};

const resolveStudentUserId = async (req, explicitUserId = null) => {
  if (explicitUserId) return Number(explicitUserId);
  if (!req.user?.id) return null;
  return getUserIdFromAccount(req.user.id);
};

const getAssignedClassIdsForStudent = async (req) => {
  const studentId = await resolveStudentUserId(req);
  if (!studentId) return [];

  const assignments = await LopSinhVien.findAll({
    where: { sinh_vien_id: studentId },
    attributes: ["lop_id"],
    raw: true,
  });

  return [...new Set(
    assignments
      .map((item) => Number(item.lop_id))
      .filter((item) => Number.isInteger(item) && item > 0)
  )];
};

const badRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizePracticeConfigInput = (body = {}, existing = {}) => {
  const input = body.cau_hinh || {};

  const tongSoCau = toPositiveInt(
    input.tong_so_cau ?? body.so_cau ?? existing.tong_so_cau,
    30
  );

  const cachTaoDe =
    (input.cach_tao_de || existing.cach_tao_de || "auto").toLowerCase() === "manual"
      ? "manual"
      : "auto";

  return {
    hoc_ky: input.hoc_ky ?? body.hoc_ky ?? existing.hoc_ky ?? null,
    nam_hoc: input.nam_hoc ?? body.nam_hoc ?? existing.nam_hoc ?? null,
    tong_so_cau: tongSoCau,
    cach_tao_de: cachTaoDe,
    tron_cau_hoi: toBoolean(input.tron_cau_hoi ?? existing.tron_cau_hoi, true),
    tron_dap_an: toBoolean(input.tron_dap_an ?? existing.tron_dap_an, true),
    so_cau_de: toPositiveInt(input.so_cau_de ?? existing.so_cau_de, Math.floor(tongSoCau / 3)),
    so_cau_trung_binh: toPositiveInt(
      input.so_cau_trung_binh ?? existing.so_cau_trung_binh,
      Math.floor(tongSoCau / 3)
    ),
    so_cau_kho: toPositiveInt(
      input.so_cau_kho ?? existing.so_cau_kho,
      Math.max(0, tongSoCau - Math.floor(tongSoCau / 3) * 2)
    ),
    ds_chuong: uniqueNumberArray(input.ds_chuong ?? existing.ds_chuong),
    ds_cau_hoi_chon: uniqueNumberArray(input.ds_cau_hoi_chon ?? existing.ds_cau_hoi_chon),
    cho_phep_lam_lai: toBoolean(input.cho_phep_lam_lai ?? existing.cho_phep_lam_lai, true),
    cho_xem_chi_tiet: toBoolean(input.cho_xem_chi_tiet ?? existing.cho_xem_chi_tiet, true),
    cho_xem_dap_an_dung: toBoolean(
      input.cho_xem_dap_an_dung ?? existing.cho_xem_dap_an_dung,
      true
    ),
  };
};

const resolvePracticeQuestionIds = async ({ monHocId, teacherUserId, config }) => {
  const baseWhere = {
    mon_hoc_id: monHocId,
  };

  if (teacherUserId) {
    baseWhere.nguoi_tao_id = teacherUserId;
  }

  if (config.cach_tao_de === "manual") {
    const selectedIds = uniqueNumberArray(config.ds_cau_hoi_chon);
    if (selectedIds.length === 0) {
      throw badRequestError("Bạn chưa chọn câu hỏi thủ công");
    }

    if (selectedIds.length !== config.tong_so_cau) {
      throw badRequestError(
        "Tổng số câu phải bằng số câu hỏi đã chọn. Vui lòng chọn thêm câu hỏi hoặc giảm tổng số câu"
      );
    }

    const rows = await CauHoi.findAll({
      where: {
        ...baseWhere,
        id: { [Op.in]: selectedIds },
      },
      attributes: ["id"],
      raw: true,
    });

    const existingIds = rows.map((item) => Number(item.id));
    if (existingIds.length !== selectedIds.length) {
      throw badRequestError("Có câu hỏi không hợp lệ hoặc không thuộc quyền giảng viên");
    }

    return existingIds;
  }

  const autoWhere = { ...baseWhere };
  if (config.ds_chuong.length > 0) {
    autoWhere.chuong = { [Op.in]: config.ds_chuong };
  }

  const pool = await CauHoi.findAll({
    where: autoWhere,
    attributes: ["id", "do_kho"],
    raw: true,
  });

  if (pool.length === 0) {
    throw badRequestError("Không có câu hỏi phù hợp để tạo bài luyện tập");
  }

  if (pool.length < config.tong_so_cau) {
    throw badRequestError(
      "Tổng số câu lớn hơn số câu hiện có. Vui lòng giảm tổng số câu hoặc bổ sung câu hỏi"
    );
  }

  const easy = pool.filter((q) => Number(q.do_kho) === 1);
  const medium = pool.filter((q) => Number(q.do_kho) === 2);
  const hard = pool.filter((q) => Number(q.do_kho) === 3);

  const selected = [
    ...pickRandom(easy, config.so_cau_de),
    ...pickRandom(medium, config.so_cau_trung_binh),
    ...pickRandom(hard, config.so_cau_kho),
  ];

  const selectedIdSet = new Set(selected.map((q) => Number(q.id)));
  const remain = pool.filter((q) => !selectedIdSet.has(Number(q.id)));

  const needMore = Math.max(0, config.tong_so_cau - selected.length);
  const finalSelected = [...selected, ...pickRandom(remain, needMore)]
    .slice(0, config.tong_so_cau)
    .map((q) => Number(q.id));

  if (finalSelected.length === 0) {
    throw new Error("Không thể tạo danh sách câu hỏi cho bài luyện tập");
  }

  return finalSelected;
};

const mapPracticeListItem = (practice) => {
  const plain = practice.toJSON();
  return {
    ...plain,
    lop_hoc: plain.lop_hoc || null,
  };
};

// ============= Quản lý bài luyện tập =============

export const createPractice = async (req, res) => {
  try {
    const {
      mon_hoc_id,
      lop_id,
      ten_bai,
      mo_ta,
      so_cau,
      thoi_gian_lam_bai,
    } = req.body;

    if (!lop_id || !ten_bai || !thoi_gian_lam_bai) {
      return res.status(400).json({
        success: false,
        error: "Thiếu thông tin bắt buộc (tên bài/lớp/thời gian)",
      });
    }

    const lop = await LopHoc.findByPk(lop_id, { raw: true });
    if (!lop) {
      return res.status(404).json({
        success: false,
        error: "Lớp không tồn tại",
      });
    }

    const teacherUserId = await getUserIdFromAccount(req.user?.id);
    const normalizedConfig = normalizePracticeConfigInput(req.body, {
      tong_so_cau: so_cau,
      hoc_ky: lop.hoc_ky,
      nam_hoc: lop.nam_hoc,
    });

    if (!normalizedConfig.hoc_ky) normalizedConfig.hoc_ky = lop.hoc_ky || null;
    if (!normalizedConfig.nam_hoc) normalizedConfig.nam_hoc = lop.nam_hoc || null;

    const questionIds = await resolvePracticeQuestionIds({
      monHocId: mon_hoc_id || 1,
      teacherUserId,
      config: normalizedConfig,
    });

    const practice = await BaiLuyenTap.create({
      mon_hoc_id: mon_hoc_id || 1,
      lop_id,
      ten_bai,
      mo_ta: mo_ta || "",
      so_cau: questionIds.length,
      thoi_gian_lam_bai: toPositiveInt(thoi_gian_lam_bai, 60),
      cau_hinh: {
        ...normalizedConfig,
        tong_so_cau: questionIds.length,
        ds_cau_hoi_chon: questionIds,
      },
    });

    res.status(201).json({
      success: true,
      data: practice,
    });
  } catch (error) {
    console.error("Error creating practice:", error);
    res.status(error?.statusCode || 500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getPracticeList = async (req, res) => {
  try {
    const { lop_id, mon_hoc_id, semester, academicYear } = req.query;

    const whereClause = {};
    let assignedClassIds = null;

    if (req.user?.role === "sinhvien") {
      assignedClassIds = await getAssignedClassIdsForStudent(req);
      if (assignedClassIds.length === 0) {
        return res.json({
          success: true,
          data: [],
        });
      }
    }

    if (lop_id) {
      const parsedClassId = Number(lop_id);
      if (!Number.isInteger(parsedClassId) || parsedClassId <= 0) {
        return res.status(400).json({
          success: false,
          error: "lop_id không hợp lệ",
        });
      }

      if (Array.isArray(assignedClassIds) && !assignedClassIds.includes(parsedClassId)) {
        return res.json({
          success: true,
          data: [],
        });
      }

      whereClause.lop_id = parsedClassId;
    } else if (Array.isArray(assignedClassIds)) {
      whereClause.lop_id = { [Op.in]: assignedClassIds };
    }

    if (mon_hoc_id) whereClause.mon_hoc_id = Number(mon_hoc_id);

    const classWhere = {};
    if (semester) classWhere.hoc_ky = semester;
    if (academicYear) classWhere.nam_hoc = academicYear;

    const practices = await BaiLuyenTap.findAll({
      where: whereClause,
      include: [
        {
          model: LopHoc,
          as: "lop_hoc",
          attributes: ["id", "ten_lop", "hoc_ky", "nam_hoc"],
          required: Object.keys(classWhere).length > 0,
          where: Object.keys(classWhere).length > 0 ? classWhere : undefined,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: practices.map(mapPracticeListItem),
    });
  } catch (error) {
    console.error("Error fetching practices:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getPracticeDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const practice = await BaiLuyenTap.findByPk(id, {
      include: [
        {
          model: LopHoc,
          as: "lop_hoc",
          attributes: ["id", "ten_lop", "hoc_ky", "nam_hoc"],
        },
        {
          model: LichSuBaiLuyenTap,
          as: "lich_su",
          include: [
            {
              model: User,
              as: "sinh_vien",
              attributes: ["id", "ho_ten", "mssv"],
            },
          ],
        },
      ],
    });

    if (!practice) {
      return res.status(404).json({
        success: false,
        error: "Practice not found",
      });
    }

    res.json({
      success: true,
      data: practice,
    });
  } catch (error) {
    console.error("Error fetching practice detail:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const updatePractice = async (req, res) => {
  try {
    const { id } = req.params;
    const practice = await BaiLuyenTap.findByPk(id);

    if (!practice) {
      return res.status(404).json({
        success: false,
        error: "Practice not found",
      });
    }

    const currentConfig = practice.cau_hinh || {};
    const normalizedConfig = normalizePracticeConfigInput(req.body, currentConfig);

    const teacherUserId = await getUserIdFromAccount(req.user?.id);
    const monHocId = req.body.mon_hoc_id || practice.mon_hoc_id || 1;
    const questionIds = await resolvePracticeQuestionIds({
      monHocId,
      teacherUserId,
      config: normalizedConfig,
    });

    await practice.update({
      ten_bai: req.body.ten_bai ?? practice.ten_bai,
      mo_ta: req.body.mo_ta ?? practice.mo_ta,
      mon_hoc_id: monHocId,
      so_cau: questionIds.length,
      thoi_gian_lam_bai:
        req.body.thoi_gian_lam_bai ?? practice.thoi_gian_lam_bai,
      trang_thai: req.body.trang_thai ?? practice.trang_thai,
      cau_hinh: {
        ...normalizedConfig,
        tong_so_cau: questionIds.length,
        ds_cau_hoi_chon: questionIds,
      },
    });

    res.json({
      success: true,
      data: practice,
    });
  } catch (error) {
    console.error("Error updating practice:", error);
    res.status(error?.statusCode || 500).json({
      success: false,
      error: error.message,
    });
  }
};

export const deletePractice = async (req, res) => {
  try {
    const { id } = req.params;

    const practice = await BaiLuyenTap.findByPk(id);
    if (!practice) {
      return res.status(404).json({
        success: false,
        error: "Practice not found",
      });
    }

    await practice.destroy();

    res.json({
      success: true,
      message: "Practice deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting practice:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ============= Làm bài luyện tập =============

export const startPractice = async (req, res) => {
  try {
    const { bai_luyen_tap_id } = req.params;
    const sinh_vien_id = await resolveStudentUserId(req, req.body.sinh_vien_id);

    if (!sinh_vien_id) {
      return res.status(400).json({
        success: false,
        error: "Student ID is required",
      });
    }

    const practice = await BaiLuyenTap.findByPk(bai_luyen_tap_id);
    if (!practice) {
      return res.status(404).json({
        success: false,
        error: "Practice not found",
      });
    }

    if (req.user?.role === "sinhvien") {
      const assigned = await LopSinhVien.findOne({
        where: {
          lop_id: practice.lop_id,
          sinh_vien_id,
        },
        raw: true,
      });

      if (!assigned) {
        return res.status(403).json({
          success: false,
          error: "Bạn không thuộc lớp của bài luyện tập này",
        });
      }
    }

    const config = practice.cau_hinh || {};
    const allowRetry = toBoolean(config.cho_phep_lam_lai, true);

    if (!allowRetry) {
      const doneCount = await LichSuBaiLuyenTap.count({
        where: {
          bai_luyen_tap_id,
          sinh_vien_id,
          trang_thai: { [Op.in]: ["da_nop", "da_cham"] },
        },
      });

      if (doneCount > 0) {
        return res.status(400).json({
          success: false,
          error: "Bài luyện tập này không cho phép làm lại",
        });
      }
    }

    const history = await LichSuBaiLuyenTap.create({
      bai_luyen_tap_id,
      sinh_vien_id,
      thoi_gian_bat_dau: new Date(),
      trang_thai: "dang_lam",
    });

    let questionIds = uniqueNumberArray(config.ds_cau_hoi_chon);

    // Fallback for legacy practices where cau_hinh.ds_cau_hoi_chon is empty.
    if (questionIds.length === 0) {
      const fallbackWhere = {};

      if (practice.mon_hoc_id) {
        fallbackWhere.mon_hoc_id = practice.mon_hoc_id;
      }

      if (Array.isArray(config.ds_chuong) && config.ds_chuong.length > 0) {
        fallbackWhere.chuong = { [Op.in]: uniqueNumberArray(config.ds_chuong) };
      }

      const fallbackLimit = Math.max(
        1,
        toPositiveInt(config.tong_so_cau ?? practice.so_cau, practice.so_cau || 30)
      );

      const fallbackRows = await CauHoi.findAll({
        where: fallbackWhere,
        attributes: ["id"],
        order: [["id", "ASC"]],
        limit: fallbackLimit,
        raw: true,
      });

      questionIds = fallbackRows.map((item) => Number(item.id));
    }

    if (questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Bài luyện tập chưa có câu hỏi",
      });
    }

    const questions = await CauHoi.findAll({
      where: { id: { [Op.in]: questionIds } },
      attributes: [
        "id",
        "noi_dung",
        "dap_an_a",
        "dap_an_b",
        "dap_an_c",
        "dap_an_d",
        "dap_an_dung",
        "do_kho",
        "chuong",
      ],
      raw: true,
    });

    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const orderedQuestions = questionIds.map((id) => questionMap.get(id)).filter(Boolean);

    res.status(201).json({
      success: true,
      data: {
        history,
        practice: {
          id: practice.id,
          ten_bai: practice.ten_bai,
          thoi_gian_lam_bai: practice.thoi_gian_lam_bai,
          cau_hinh: config,
        },
        questions: orderedQuestions,
      },
    });
  } catch (error) {
    console.error("Error starting practice:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const submitPractice = async (req, res) => {
  try {
    const { lich_su_bai_id } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Answers must be a non-empty array",
      });
    }

    const history = await LichSuBaiLuyenTap.findByPk(lich_su_bai_id, {
      include: [
        {
          model: BaiLuyenTap,
          as: "bai_luyen_tap",
        },
      ],
    });

    if (!history) {
      return res.status(404).json({
        success: false,
        error: "Practice history not found",
      });
    }

    let allowedQuestionIds = uniqueNumberArray(
      history.bai_luyen_tap?.cau_hinh?.ds_cau_hoi_chon || []
    );

    if (allowedQuestionIds.length === 0) {
      const fallbackLimit = Math.max(
        1,
        toPositiveInt(
          history.bai_luyen_tap?.cau_hinh?.tong_so_cau ?? history.bai_luyen_tap?.so_cau,
          history.bai_luyen_tap?.so_cau || 30
        )
      );

      const fallbackRows = await CauHoi.findAll({
        where: history.bai_luyen_tap?.mon_hoc_id
          ? { mon_hoc_id: history.bai_luyen_tap.mon_hoc_id }
          : {},
        attributes: ["id"],
        order: [["id", "ASC"]],
        limit: fallbackLimit,
        raw: true,
      });

      allowedQuestionIds = fallbackRows.map((item) => Number(item.id));
    }

    if (allowedQuestionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Bài luyện tập chưa có cấu hình câu hỏi",
      });
    }

    const answerQuestionIds = uniqueNumberArray(answers.map((item) => item.cau_hoi_id));
    const invalidQuestion = answerQuestionIds.find((id) => !allowedQuestionIds.includes(id));

    if (invalidQuestion) {
      return res.status(400).json({
        success: false,
        error: `Câu hỏi ${invalidQuestion} không thuộc bài luyện tập này`,
      });
    }

    const questions = await CauHoi.findAll({
      where: { id: { [Op.in]: allowedQuestionIds } },
      attributes: ["id", "dap_an_dung"],
      raw: true,
    });

    const questionMap = new Map(questions.map((q) => [Number(q.id), q]));

    let correctCount = 0;
    const detailRows = answers
      .map((ans) => {
        const question = questionMap.get(Number(ans.cau_hoi_id));
        if (!question) return null;

        const selectedAnswer = String(ans.dap_an_student || "").trim().toUpperCase() || null;
        const correctAnswer = String(question.dap_an_dung || "").trim().toUpperCase();
        const isCorrect = Boolean(selectedAnswer && selectedAnswer === correctAnswer);

        if (isCorrect) correctCount += 1;

        return {
          lich_su_bai_id: Number(lich_su_bai_id),
          cau_hoi_id: Number(ans.cau_hoi_id),
          dap_an_student: selectedAnswer,
          dap_an_dung: correctAnswer,
          dung_sai: isCorrect,
        };
      })
      .filter(Boolean);

    if (detailRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Không có đáp án hợp lệ để chấm điểm",
      });
    }

    await ChiTietBaiLuyenTap.destroy({
      where: { lich_su_bai_id: Number(lich_su_bai_id) },
    });

    await ChiTietBaiLuyenTap.bulkCreate(detailRows);

    const score = Number(((correctCount / allowedQuestionIds.length) * 10).toFixed(2));

    await history.update({
      thoi_gian_nop: new Date(),
      tong_diem: score,
      trang_thai: "da_cham",
    });

    res.json({
      success: true,
      data: {
        lich_su_bai_id: Number(lich_su_bai_id),
        correctCount,
        totalCount: allowedQuestionIds.length,
        score,
        trang_thai: "da_cham",
      },
    });
  } catch (error) {
    console.error("Error submitting practice:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getPracticeResult = async (req, res) => {
  try {
    const { lich_su_bai_id } = req.params;

    const history = await LichSuBaiLuyenTap.findByPk(lich_su_bai_id, {
      include: [
        {
          model: BaiLuyenTap,
          as: "bai_luyen_tap",
          attributes: ["id", "ten_bai", "cau_hinh"],
        },
        {
          model: ChiTietBaiLuyenTap,
          as: "chi_tiet",
          include: [
            {
              model: CauHoi,
              as: "cau_hoi",
              attributes: [
                "id",
                "noi_dung",
                "dap_an_a",
                "dap_an_b",
                "dap_an_c",
                "dap_an_d",
                "dap_an_dung",
                "do_kho",
                "chuong",
              ],
            },
          ],
        },
      ],
    });

    if (!history) {
      return res.status(404).json({
        success: false,
        error: "Practice history not found",
      });
    }

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching practice result:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getPracticeHistoryForStudent = async (req, res) => {
  try {
    const { bai_luyen_tap_id } = req.params;
    const sinh_vien_id = await resolveStudentUserId(req, req.query.sinh_vien_id);

    if (!sinh_vien_id) {
      return res.status(400).json({
        success: false,
        error: "Student ID is required",
      });
    }

    const history = await LichSuBaiLuyenTap.findAll({
      where: {
        bai_luyen_tap_id,
        sinh_vien_id,
      },
      include: [
        {
          model: BaiLuyenTap,
          as: "bai_luyen_tap",
          attributes: ["id", "ten_bai", "thoi_gian_lam_bai", "cau_hinh"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching practice history:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ============= Thống kê =============

export const getPracticeStatistics = async (req, res) => {
  try {
    const { bai_luyen_tap_id } = req.params;

    const history = await LichSuBaiLuyenTap.findAll({
      where: {
        bai_luyen_tap_id,
      },
      include: [
        {
          model: User,
          as: "sinh_vien",
          attributes: ["id", "ho_ten", "mssv"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const scored = history.filter((item) => item.tong_diem !== null);
    const scores = scored.map((item) => Number(item.tong_diem));

    if (history.length === 0) {
      return res.json({
        success: true,
        data: {
          tong_sinh_vien_lam: 0,
          so_sinh_vien_da_nop: 0,
          diem_trung_binh: 0,
          diem_cao_nhat: 0,
          diem_thap_nhat: 0,
          chi_tiet: [],
        },
      });
    }

    const diemTrungBinh =
      scores.length > 0
        ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2))
        : 0;

    res.json({
      success: true,
      data: {
        tong_sinh_vien_lam: history.length,
        so_sinh_vien_da_nop: scored.length,
        diem_trung_binh: diemTrungBinh,
        diem_cao_nhat: scores.length > 0 ? Math.max(...scores) : 0,
        diem_thap_nhat: scores.length > 0 ? Math.min(...scores) : 0,
        chi_tiet: history.map((item) => ({
          lich_su_bai_id: item.id,
          sinh_vien_id: item.sinh_vien_id,
          sinh_vien_name: item.sinh_vien?.ho_ten || null,
          ma_so: item.sinh_vien?.mssv || null,
          tong_diem: item.tong_diem,
          thoi_gian_bat_dau: item.thoi_gian_bat_dau,
          thoi_gian_nop: item.thoi_gian_nop,
          trang_thai: item.trang_thai,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching practice statistics:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getStudentPracticeStatistics = async (req, res) => {
  try {
    const sinh_vien_id = await resolveStudentUserId(req, req.params.sinh_vien_id);

    if (!sinh_vien_id) {
      return res.status(400).json({
        success: false,
        error: "Student ID is required",
      });
    }

    const history = await LichSuBaiLuyenTap.findAll({
      where: {
        sinh_vien_id,
      },
      include: [
        {
          model: BaiLuyenTap,
          as: "bai_luyen_tap",
          attributes: ["id", "ten_bai", "lop_id", "cau_hinh"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const statistics = history.map((item) => ({
      lich_su_bai_id: item.id,
      bai_luyen_tap_id: item.bai_luyen_tap_id,
      ten_bai: item.bai_luyen_tap?.ten_bai || "Unknown",
      tong_diem: item.tong_diem,
      thoi_gian_bat_dau: item.thoi_gian_bat_dau,
      thoi_gian_nop: item.thoi_gian_nop,
      trang_thai: item.trang_thai,
      cho_xem_chi_tiet: toBoolean(item.bai_luyen_tap?.cau_hinh?.cho_xem_chi_tiet, true),
      cho_xem_dap_an_dung: toBoolean(item.bai_luyen_tap?.cau_hinh?.cho_xem_dap_an_dung, true),
    }));

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("Error fetching student statistics:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
