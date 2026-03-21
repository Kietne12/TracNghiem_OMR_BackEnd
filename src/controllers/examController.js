import { Op } from "sequelize";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { detectOMRMarkings } from "../utils/omrDetectorEnhanced.js";
import {
  sequelize,
  Account,
  KyThi,
  LopHoc,
  LopSinhVien,
  User,
  CauHoi,
  CauHoiKyThi,
  ChiTietBaiLam,
  CauHinhKyThi,
  FileOMR,
  KetQuaOMR,
  BaiLam,
} from "../models/index.js";

const toPositiveInt = (value, defaultValue = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return defaultValue;
  return Math.floor(parsed);
};

const uniqueNumberArray = (values) => {
  if (!Array.isArray(values)) return [];
  const parsed = values
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0);
  return [...new Set(parsed)];
};

const shuffleArray = (arr) => {
  const cloned = [...arr];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
};

const pickRandom = (arr, count) => shuffleArray(arr).slice(0, count);

const getTeacherUserId = async (accountId) => {
  const account = await Account.findByPk(accountId);
  if (!account) return null;
  return account.user_id;
};

const ANSWER_LETTERS = ["A", "B", "C", "D"];

const FALLBACK_FONT_PATHS = [
  process.env.OMR_PDF_FONT,
  "C:/Windows/Fonts/arial.ttf",
  "C:/Windows/Fonts/tahoma.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
].filter(Boolean);

const resolvePdfFontPath = () => FALLBACK_FONT_PATHS.find((fontPath) => fs.existsSync(fontPath));

const safeFileName = (value, fallback = "download") => {
  if (!value || typeof value !== "string") return fallback;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
  return normalized || fallback;
};

const attachPdfResponse = (res, chunks, fileName) => {
  const pdfBuffer = Buffer.concat(chunks);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Length", pdfBuffer.length);
  res.status(200).send(pdfBuffer);
};

const setPdfFont = (doc, preferredFontPath) => {
  if (!preferredFontPath) {
    doc.font("Helvetica");
    return;
  }

  try {
    doc.font(preferredFontPath);
  } catch {
    doc.font("Helvetica");
  }
};

const normalizeAnswerChoice = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase();
  return ANSWER_LETTERS.includes(normalized) ? normalized : null;
};

const parseOmrAnswersInput = (rawAnswers) => {
  const parsed = {
    answerList: [],
    answerMap: {},
  };

  const parseArray = (values) => {
    parsed.answerList = values.map((item) => normalizeAnswerChoice(item));
  };

  const parseObject = (values) => {
    Object.entries(values).forEach(([key, value]) => {
      const qid = Number(key);
      if (!Number.isInteger(qid) || qid <= 0) return;
      parsed.answerMap[qid] = normalizeAnswerChoice(value);
    });
  };

  if (Array.isArray(rawAnswers)) {
    parseArray(rawAnswers);
    return parsed;
  }

  if (rawAnswers && typeof rawAnswers === "object") {
    parseObject(rawAnswers);
    return parsed;
  }

  if (typeof rawAnswers !== "string") {
    return parsed;
  }

  const trimmed = rawAnswers.trim();
  if (!trimmed) return parsed;

  const isJsonLike =
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"));

  if (isJsonLike) {
    try {
      const decoded = JSON.parse(trimmed);
      if (Array.isArray(decoded)) {
        parseArray(decoded);
      } else if (decoded && typeof decoded === "object") {
        parseObject(decoded);
      }
      return parsed;
    } catch {
      // Fallback to CSV parser.
    }
  }

  parseArray(trimmed.split(/[\s,;|]+/).filter(Boolean));
  return parsed;
};

const extractAutoGradePayloadFromBody = (body = {}) => {
  const mssv = body?.mssv ?? body?.MSSV ?? null;
  const maDe = body?.ma_de ?? body?.maDe ?? body?.made ?? null;
  const answersInput =
    body?.answers ??
    body?.dap_an ??
    body?.answer_list ??
    body?.answerList ??
    null;

  if (!mssv || !answersInput) return null;

  return {
    mssv: String(mssv).trim(),
    maDe: maDe ? String(maDe).trim() : null,
    answersInput,
  };
};

const requestAutoScanPayload = async ({ examId, fileRecord }) => {
  const scannerApiUrl = process.env.OMR_SCANNER_API_URL;
  if (!scannerApiUrl) return null;

  if (typeof fetch !== "function") {
    throw new Error("Runtime không hỗ trợ fetch để gọi scanner API");
  }

  const absoluteImagePath = path.resolve(String(fileRecord.duong_dan || "").replace(/^\/+/, ""));

  const response = await fetch(scannerApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ky_thi_id: Number(examId),
      file_omr_id: fileRecord.id,
      image_path: absoluteImagePath,
      image_url: fileRecord.duong_dan,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Scanner API trả về lỗi ${response.status}${errorText ? `: ${errorText}` : ""}`
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Scanner API không trả về JSON hợp lệ");
  }

  const source = payload?.result && typeof payload.result === "object" ? payload.result : payload;
  const mssv = source?.mssv ?? source?.student_id ?? source?.studentId ?? null;
  const maDe = source?.ma_de ?? source?.maDe ?? source?.made ?? null;
  const answersInput =
    source?.answers ??
    source?.dap_an ??
    source?.answer_list ??
    source?.answerList ??
    null;

  if (!mssv || !answersInput) {
    throw new Error("Scanner API thiếu dữ liệu mssv hoặc answers");
  }

  return {
    mssv: String(mssv).trim(),
    maDe: maDe ? String(maDe).trim() : null,
    answersInput,
  };
};

/**
 * Scan OMR using local detector (enhanced with anchor points & perspective transform)
 * Falls back if detection fails
 */
const scanOmrLocally = async (imagePath) => {
  try {
    console.log(`\n📷 Quét OMR từ ảnh cục bộ: ${imagePath}`);
    
    // Resolve absolute path if relative
    const absolutePath = imagePath.startsWith("/") 
      ? path.resolve(process.cwd(), imagePath.replace(/^\/+/, ""))
      : imagePath;

    if (!fs.existsSync(absolutePath)) {
      console.warn(`   ⚠ Ảnh không tồn tại: ${absolutePath}`);
      return null;
    }

    const result = await detectOMRMarkings(absolutePath);
    
    if (!result || !result.mssv) {
      console.log(`   ⚠ Quét cục bộ không được kết quả hợp lệ`);
      return null;
    }

    console.log(`\n   ✅ Quét cục bộ thành công:`);
    console.log(`      SBD: ${result.mssv}`);
    console.log(`      Mã Đề: ${result.maDe || 'N/A'}`);
    console.log(`      Answers: ${result.answers.filter(a => a).length}/60 câu`);

    return {
      mssv: result.mssv,
      maDe: result.maDe || null,
      answersInput: result.answers,
      usedLocalDetector: true,
      anchorPointsDetected: result.anchorsDetected,
      perspectiveApplied: result.perspectiveApplied,
    };
  } catch (error) {
    console.warn(`   ⚠ Lỗi quét cục bộ: ${error.message}`);
    return null;
  }
};

/**
 * Request auto-scan payload: try local detector first, fall back to API
 */
const requestAutoScanPayloadWithLocalFallback = async ({ examId, fileRecord }) => {
  // Try local detector first
  console.log("\n════════════════════════════════════════");
  console.log("🔄 Bắt đầu quét OMR...");
  console.log("════════════════════════════════════════");

  const localResult = await scanOmrLocally(fileRecord.duong_dan);
  if (localResult) {
    return localResult;
  }

  // Fall back to external API if local detection fails
  console.log("\n⬇️  Quét cục bộ không thành công, thử API bên ngoài...");
  try {
    return await requestAutoScanPayload({ examId, fileRecord });
  } catch (apiError) {
    console.warn(`   ⚠ API cũng không khả dụng hoặc thất bại: ${apiError.message}`);
    return null;
  }
};

const resolveOmrExamStructure = async (examId, config, requestedMaDe) => {
  const examQuestions = await CauHoiKyThi.findAll({
    where: { ky_thi_id: examId },
    attributes: ["cau_hoi_id"],
    order: [["id", "ASC"]],
    raw: true,
  });

  const fallbackQuestionIds = examQuestions
    .map((item) => Number(item.cau_hoi_id))
    .filter((item) => Number.isInteger(item) && item > 0);

  if (fallbackQuestionIds.length === 0) {
    throw new Error("Kỳ thi chưa có dữ liệu câu hỏi để chấm OMR");
  }

  const maDeList = Array.isArray(config?.ma_de_data) ? config.ma_de_data : [];
  const normalizedRequestedMaDe = requestedMaDe ? String(requestedMaDe).trim().toUpperCase() : null;

  let selectedMaDeData = null;
  if (normalizedRequestedMaDe) {
    selectedMaDeData = maDeList.find(
      (item) => String(item?.ma_de || "").trim().toUpperCase() === normalizedRequestedMaDe
    );
    if (!selectedMaDeData) {
      throw new Error("Mã đề không hợp lệ hoặc không tồn tại trong kỳ thi");
    }
  } else if (maDeList.length > 0) {
    selectedMaDeData = maDeList[0];
  }

  const fromMaDe = Array.isArray(selectedMaDeData?.question_order)
    ? selectedMaDeData.question_order
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    : [];

  return {
    questionIds: fromMaDe.length > 0 ? fromMaDe : fallbackQuestionIds,
    answerOrder: selectedMaDeData?.answer_order || {},
    maDe: selectedMaDeData?.ma_de || normalizedRequestedMaDe || null,
  };
};

const gradeOmrAttempt = async ({ examId, fileOmrId, mssv, maDe, answersInput }) => {
  const student = await User.findOne({
    where: { mssv: String(mssv).trim() },
    attributes: ["id", "mssv", "ho_ten"],
  });

  if (!student) {
    throw new Error("Không tìm thấy sinh viên theo MSSV");
  }

  const config = await CauHinhKyThi.findOne({
    where: { ky_thi_id: examId },
    raw: true,
  });

  if (!config || config.hinh_thuc_thi !== "omr") {
    throw new Error("Kỳ thi này không ở chế độ OMR");
  }

  const structure = await resolveOmrExamStructure(examId, config, maDe);
  const parsedAnswers = parseOmrAnswersInput(answersInput);

  const questionRows = await CauHoi.findAll({
    where: { id: { [Op.in]: structure.questionIds } },
    attributes: ["id", "dap_an_dung"],
    raw: true,
  });

  const questionMap = new Map(questionRows.map((item) => [Number(item.id), item]));
  const details = [];
  let correctCount = 0;

  structure.questionIds.forEach((questionId, index) => {
    const question = questionMap.get(questionId);
    const displayedAnswer =
      parsedAnswers.answerList[index] || parsedAnswers.answerMap[questionId] || null;

    let normalizedAnswer = displayedAnswer;
    const questionOrder = structure.answerOrder?.[questionId] || structure.answerOrder?.[String(questionId)];

    if (normalizedAnswer && Array.isArray(questionOrder) && questionOrder.length >= 4) {
      const selectedIndex = ANSWER_LETTERS.indexOf(normalizedAnswer);
      if (selectedIndex >= 0) {
        normalizedAnswer = normalizeAnswerChoice(questionOrder[selectedIndex]);
      }
    }

    const isCorrect = Boolean(
      question && normalizedAnswer && normalizeAnswerChoice(question.dap_an_dung) === normalizedAnswer
    );

    if (isCorrect) correctCount += 1;

    details.push({
      cau_hoi_id: questionId,
      dap_an_chon: normalizedAnswer,
      dung_sai: isCorrect,
    });
  });

  const totalQuestions = structure.questionIds.length;
  const score = Number(((correctCount / totalQuestions) * 10).toFixed(2));

  const now = new Date();
  const tx = await sequelize.transaction();

  try {
    let attempt = await BaiLam.findOne({
      where: { ky_thi_id: examId, sinh_vien_id: student.id },
      transaction: tx,
    });

    if (attempt) {
      await attempt.update(
        {
          thoi_gian_nop: now,
          tong_diem: score,
        },
        { transaction: tx }
      );
    } else {
      attempt = await BaiLam.create(
        {
          ky_thi_id: examId,
          sinh_vien_id: student.id,
          thoi_gian_bat_dau: now,
          thoi_gian_nop: now,
          tong_diem: score,
        },
        { transaction: tx }
      );
    }

    await ChiTietBaiLam.destroy({
      where: { bai_lam_id: attempt.id },
      transaction: tx,
    });

    await ChiTietBaiLam.bulkCreate(
      details.map((item) => ({
        bai_lam_id: attempt.id,
        cau_hoi_id: item.cau_hoi_id,
        dap_an_chon: item.dap_an_chon,
        dung_sai: item.dung_sai,
      })),
      { transaction: tx }
    );

    if (fileOmrId) {
      const existedOmrResult = await KetQuaOMR.findOne({
        where: {
          file_omr_id: fileOmrId,
          sinh_vien_id: student.id,
        },
        transaction: tx,
      });

      if (existedOmrResult) {
        await existedOmrResult.update({ diem: score }, { transaction: tx });
      } else {
        await KetQuaOMR.create(
          {
            file_omr_id: fileOmrId,
            sinh_vien_id: student.id,
            diem: score,
          },
          { transaction: tx }
        );
      }
    }

    await tx.commit();

    return {
      bai_lam_id: attempt.id,
      sinh_vien_id: student.id,
      mssv: student.mssv,
      ho_ten: student.ho_ten,
      ma_de: structure.maDe,
      tong_so_cau: totalQuestions,
      so_cau_dung: correctCount,
      diem: score,
    };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
};

const normalizeExamConfigInput = (body = {}, existingConfig = null) => {
  const input = body.cau_hinh || body;

  return {
    hoc_ky: input.hoc_ky ?? body.hoc_ky ?? existingConfig?.hoc_ky ?? null,
    nam_hoc: input.nam_hoc ?? body.nam_hoc ?? existingConfig?.nam_hoc ?? null,
    tong_so_cau: toPositiveInt(
      input.tong_so_cau ?? body.tong_so_cau ?? existingConfig?.tong_so_cau,
      30
    ),
    hinh_thuc_thi:
      (input.hinh_thuc_thi || existingConfig?.hinh_thuc_thi || "online").toLowerCase() === "omr"
        ? "omr"
        : "online",
    cach_tao_de:
      (input.cach_tao_de || existingConfig?.cach_tao_de || "auto").toLowerCase() === "manual"
        ? "manual"
        : "auto",
    tron_cau_hoi: Boolean(input.tron_cau_hoi ?? existingConfig?.tron_cau_hoi ?? false),
    tron_dap_an: Boolean(input.tron_dap_an ?? existingConfig?.tron_dap_an ?? false),
    so_ma_de: Math.max(
      1,
      toPositiveInt(input.so_ma_de ?? existingConfig?.so_ma_de, 1)
    ),
    so_cau_de: toPositiveInt(input.so_cau_de ?? existingConfig?.so_cau_de, 0),
    so_cau_trung_binh: toPositiveInt(
      input.so_cau_trung_binh ?? existingConfig?.so_cau_trung_binh,
      0
    ),
    so_cau_kho: toPositiveInt(input.so_cau_kho ?? existingConfig?.so_cau_kho, 0),
    ds_chuong: uniqueNumberArray(input.ds_chuong ?? existingConfig?.ds_chuong),
    ds_cau_hoi_chon: uniqueNumberArray(
      input.ds_cau_hoi_chon ?? existingConfig?.ds_cau_hoi_chon
    ),
    cho_phep_chinh_sua: true,
  };
};

const resolveQuestionIds = async ({
  monHocId,
  teacherUserId,
  config,
}) => {
  const baseWhere = {
    mon_hoc_id: monHocId,
  };

  if (teacherUserId) {
    baseWhere.nguoi_tao_id = teacherUserId;
  }

  if (config.ds_chuong.length > 0) {
    baseWhere.chuong = { [Op.in]: config.ds_chuong };
  }

  if (config.cach_tao_de === "manual") {
    if (config.ds_cau_hoi_chon.length === 0) {
      throw new Error("Bạn chưa chọn câu hỏi cho chế độ thủ công");
    }

    if (config.ds_cau_hoi_chon.length !== config.tong_so_cau) {
      throw new Error("Tổng số câu phải bằng số câu đã chọn thủ công");
    }

    const manualQuestions = await CauHoi.findAll({
      where: {
        ...baseWhere,
        id: { [Op.in]: config.ds_cau_hoi_chon },
      },
      attributes: ["id"],
    });

    if (manualQuestions.length !== config.ds_cau_hoi_chon.length) {
      throw new Error("Có câu hỏi thủ công không hợp lệ hoặc không thuộc quyền giảng viên");
    }

    return config.ds_cau_hoi_chon;
  }

  const questionPool = await CauHoi.findAll({
    where: baseWhere,
    attributes: ["id", "do_kho", "chuong"],
  });

  if (questionPool.length < config.tong_so_cau) {
    throw new Error("Không đủ số lượng câu hỏi trong ngân hàng để sinh đề");
  }

  let easy = config.so_cau_de;
  let medium = config.so_cau_trung_binh;
  let hard = config.so_cau_kho;
  let requested = easy + medium + hard;

  if (requested === 0) {
    medium = config.tong_so_cau;
    requested = medium;
  }

  if (requested > config.tong_so_cau) {
    throw new Error("Tổng số câu theo độ khó không được vượt quá tổng số câu đề thi");
  }

  const easyPool = questionPool.filter((q) => Number(q.do_kho) === 1);
  const mediumPool = questionPool.filter((q) => Number(q.do_kho) === 2);
  const hardPool = questionPool.filter((q) => Number(q.do_kho) === 3);

  if (easyPool.length < easy || mediumPool.length < medium || hardPool.length < hard) {
    throw new Error("Không đủ câu hỏi theo phân bố độ khó đã chọn");
  }

  const selected = [
    ...pickRandom(easyPool, easy),
    ...pickRandom(mediumPool, medium),
    ...pickRandom(hardPool, hard),
  ];

  const selectedIdsSet = new Set(selected.map((q) => q.id));
  const remainingNeeded = config.tong_so_cau - selected.length;

  if (remainingNeeded > 0) {
    const leftovers = questionPool.filter((q) => !selectedIdsSet.has(q.id));
    if (leftovers.length < remainingNeeded) {
      throw new Error("Không đủ câu hỏi để hoàn tất đề theo tổng số câu yêu cầu");
    }
    selected.push(...pickRandom(leftovers, remainingNeeded));
  }

  return selected.map((q) => q.id);
};

const generateMaDeData = ({ questionIds, soMaDe, tronCauHoi, tronDapAn }) => {
  const answerOptions = ["A", "B", "C", "D"];

  return Array.from({ length: soMaDe }).map((_, index) => {
    const maDe = String(index + 1).padStart(3, "0");
    const orderedQuestionIds = tronCauHoi ? shuffleArray(questionIds) : [...questionIds];

    const answerMap = orderedQuestionIds.reduce((acc, questionId) => {
      acc[questionId] = tronDapAn ? shuffleArray(answerOptions) : answerOptions;
      return acc;
    }, {});

    return {
      ma_de: maDe,
      question_order: orderedQuestionIds,
      answer_order: answerMap,
    };
  });
};

const persistExamAndConfig = async ({
  exam,
  examPayload,
  config,
  questionIds,
  maDeData,
}) => {
  const tx = await sequelize.transaction();

  try {
    await exam.update(examPayload, { transaction: tx });

    await CauHoiKyThi.destroy({
      where: { ky_thi_id: exam.id },
      transaction: tx,
    });

    await CauHoiKyThi.bulkCreate(
      questionIds.map((questionId) => ({
        ky_thi_id: exam.id,
        cau_hoi_id: questionId,
      })),
      { transaction: tx }
    );

    const [existingConfig] = await CauHinhKyThi.findOrCreate({
      where: { ky_thi_id: exam.id },
      defaults: {
        ky_thi_id: exam.id,
      },
      transaction: tx,
    });

    await existingConfig.update(
      {
        ...config,
        ma_de_data: maDeData,
        ds_cau_hoi_chon: questionIds,
      },
      { transaction: tx }
    );

    await tx.commit();

    return existingConfig;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
};

// ================== GET CLASSES ==================
export const getClasses = async (req, res) => {
  try {
    const { semester, academicYear } = req.query;

    const whereClause = {
      trang_thai: true,
    };

    const classAttributes = ["id", "ten_lop", "hoc_ky", "nam_hoc"];

    if (semester) {
      whereClause.hoc_ky = semester;
    }

    if (academicYear) {
      whereClause.nam_hoc = academicYear;
    }

    const classes = await LopHoc.findAll({
      where: whereClause,
      attributes: classAttributes,
      order: [["ten_lop", "ASC"]],
    });

    const classesWithSize = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await LopSinhVien.count({
          where: { lop_id: cls.id },
        });

        return {
          id: cls.id,
          ten_lop: cls.ten_lop,
          hoc_ky: cls.hoc_ky || null,
          nam_hoc: cls.nam_hoc || null,
          si_so: studentCount,
        };
      })
    );

    res.status(200).json({
      classes: classesWithSize,
    });
  } catch (error) {
    console.error("getClasses error:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách lớp" });
  }
};

// ===== GET ALL EXAMS =====
export const getExams = async (req, res) => {
  try {
    const { lop_id } = req.query;
    const whereClause = {};

    if (lop_id) {
      const parsedClassId = Number(lop_id);
      if (!Number.isInteger(parsedClassId) || parsedClassId <= 0) {
        return res.status(400).json({ message: "lop_id không hợp lệ" });
      }
      whereClause.lop_id = parsedClassId;
    }

    const exams = await KyThi.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    const enriched = await Promise.all(
      exams.map(async (exam) => {
        const config = await CauHinhKyThi.findOne({
          where: { ky_thi_id: exam.id },
          raw: true,
        });

        const totalQuestions = await CauHoiKyThi.count({
          where: { ky_thi_id: exam.id },
        });

        return {
          ...exam.toJSON(),
          cau_hinh: config || null,
          tong_so_cau: config?.tong_so_cau || totalQuestions,
        };
      })
    );

    res.json({ exams: enriched });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách kỳ thi" });
  }
};

// ===== GET EXAM BY ID =====
export const getExamById = async (req, res) => {
  try {
    const exam = await KyThi.findByPk(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy kỳ thi" });
    }

    const config = await CauHinhKyThi.findOne({
      where: { ky_thi_id: exam.id },
      raw: true,
    });

    const examQuestions = await CauHoiKyThi.findAll({
      where: { ky_thi_id: exam.id },
      include: [
        {
          model: CauHoi,
          attributes: ["id", "noi_dung", "do_kho", "chuong"],
        },
      ],
    });

    res.json({
      exam,
      cau_hinh: config,
      questions: examQuestions,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ===== SUBMIT EXAM =====
export const submitExam = async (req, res) => {
  res.json({ message: "Submit chưa làm 😅" });
};

// ================== CREATE EXAM ==================
export const createExam = async (req, res) => {
  try {
    const {
      ten_ky_thi,
      mon_hoc_id,
      lop_id,
      thoi_gian_lam_bai,
      thoi_gian_bat_dau,
      thoi_gian_ket_thuc,
      hoc_ky,
      nam_hoc,
    } = req.body;

    if (!ten_ky_thi || !lop_id || !thoi_gian_lam_bai) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc (tên kỳ thi/lớp/thời gian)" });
    }

    const lop = await LopHoc.findByPk(lop_id);
    if (!lop) {
      return res.status(404).json({ message: "Lớp không tồn tại" });
    }

    const teacherUserId = await getTeacherUserId(req.user.id);
    if (!teacherUserId) {
      return res.status(401).json({ message: "Tài khoản giảng viên không hợp lệ" });
    }

    const config = normalizeExamConfigInput(req.body);
    config.hoc_ky = hoc_ky ?? config.hoc_ky;
    config.nam_hoc = nam_hoc ?? config.nam_hoc;

    const questionIds = await resolveQuestionIds({
      monHocId: mon_hoc_id || 1,
      teacherUserId,
      config,
    });

    const maDeData = generateMaDeData({
      questionIds,
      soMaDe: config.so_ma_de,
      tronCauHoi: config.tron_cau_hoi,
      tronDapAn: config.tron_dap_an,
    });

    const startAt = thoi_gian_bat_dau ? new Date(thoi_gian_bat_dau) : new Date();
    const endAt = thoi_gian_ket_thuc
      ? new Date(thoi_gian_ket_thuc)
      : new Date(startAt.getTime() + Number(thoi_gian_lam_bai) * 60000);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return res.status(400).json({ message: "Thời gian bắt đầu/kết thúc không hợp lệ" });
    }

    const examPayload = {
      ten_ky_thi,
      mon_hoc_id: mon_hoc_id || 1,
      lop_id,
      thoi_gian_lam_bai,
      thoi_gian_bat_dau: startAt,
      thoi_gian_ket_thuc: endAt,
      trang_thai: "open",
    };

    const newExam = await KyThi.create(examPayload);
    const createdConfig = await persistExamAndConfig({
      exam: newExam,
      examPayload,
      config,
      questionIds,
      maDeData,
    });

    res.status(201).json({
      message: "Tạo kỳ thi thành công",
      exam: newExam,
      cau_hinh: createdConfig,
    });
  } catch (error) {
    console.error("createExam error:", error);
    res.status(500).json({ message: error.message || "Lỗi server" });
  }
};

export const updateExamConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await KyThi.findByPk(id);

    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy kỳ thi" });
    }

    const lopId = req.body.lop_id || exam.lop_id;
    const lop = await LopHoc.findByPk(lopId);
    if (!lop) {
      return res.status(404).json({ message: "Lớp không tồn tại" });
    }

    const teacherUserId = await getTeacherUserId(req.user.id);
    if (!teacherUserId) {
      return res.status(401).json({ message: "Tài khoản giảng viên không hợp lệ" });
    }

    const existingConfig = await CauHinhKyThi.findOne({
      where: { ky_thi_id: exam.id },
    });

    const config = normalizeExamConfigInput(req.body, existingConfig);
    const questionIds = await resolveQuestionIds({
      monHocId: req.body.mon_hoc_id || exam.mon_hoc_id || 1,
      teacherUserId,
      config,
    });

    const maDeData = generateMaDeData({
      questionIds,
      soMaDe: config.so_ma_de,
      tronCauHoi: config.tron_cau_hoi,
      tronDapAn: config.tron_dap_an,
    });

    const startAt = req.body.thoi_gian_bat_dau
      ? new Date(req.body.thoi_gian_bat_dau)
      : exam.thoi_gian_bat_dau;
    const endAt = req.body.thoi_gian_ket_thuc
      ? new Date(req.body.thoi_gian_ket_thuc)
      : exam.thoi_gian_ket_thuc;

    if (Number.isNaN(new Date(startAt).getTime()) || Number.isNaN(new Date(endAt).getTime())) {
      return res.status(400).json({ message: "Thời gian bắt đầu/kết thúc không hợp lệ" });
    }

    const examPayload = {
      ten_ky_thi: req.body.ten_ky_thi || exam.ten_ky_thi,
      mon_hoc_id: req.body.mon_hoc_id || exam.mon_hoc_id || 1,
      lop_id: lopId,
      thoi_gian_lam_bai: req.body.thoi_gian_lam_bai || exam.thoi_gian_lam_bai,
      thoi_gian_bat_dau: startAt,
      thoi_gian_ket_thuc: endAt,
      trang_thai: req.body.trang_thai || exam.trang_thai || "open",
    };

    const updatedConfig = await persistExamAndConfig({
      exam,
      examPayload,
      config,
      questionIds,
      maDeData,
    });

    const refreshedExam = await KyThi.findByPk(id);

    return res.status(200).json({
      message: "Cập nhật cấu hình kỳ thi thành công",
      exam: refreshedExam,
      cau_hinh: updatedConfig,
    });
  } catch (error) {
    console.error("updateExamConfig error:", error);
    return res.status(500).json({ message: error.message || "Lỗi server" });
  }
};

export const getOmrTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await KyThi.findByPk(id);
    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy kỳ thi" });
    }

    const config = await CauHinhKyThi.findOne({
      where: { ky_thi_id: id },
      raw: true,
    });

    if (!config || config.hinh_thuc_thi !== "omr") {
      return res.status(400).json({ message: "Kỳ thi này không ở chế độ OMR" });
    }

    const totalQuestions = config.tong_so_cau || 30;
    const columns = 3;
    const rowsPerColumn = Math.ceil(totalQuestions / columns);

    const maDeList = Array.isArray(config.ma_de_data)
      ? config.ma_de_data.map((item) => item.ma_de)
      : [];

    return res.status(200).json({
      exam: {
        id: exam.id,
        ten_ky_thi: exam.ten_ky_thi,
      },
      template: {
        student_id_boxes: 8,
        exam_code_boxes: 3,
        answer_choices: ["A", "B", "C", "D"],
        columns,
        rows_per_column: rowsPerColumn,
        total_questions: totalQuestions,
        generated_exam_codes: maDeList,
        note: "Phiếu mẫu gồm 3 khung: mã sinh viên, mã đề và đáp án. Giảng viên in đề theo mã đề tương ứng.",
      },
    });
  } catch (error) {
    console.error("getOmrTemplate error:", error);
    return res.status(500).json({ message: "Lỗi khi tạo template OMR" });
  }
};

export const getExamGradingResults = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await KyThi.findByPk(id);
    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy kỳ thi" });
    }

    const examConfig = await CauHinhKyThi.findOne({
      where: { ky_thi_id: exam.id },
      raw: true,
    });

    const totalQuestions = await CauHoiKyThi.count({ where: { ky_thi_id: exam.id } });

    const attempts = await BaiLam.findAll({
      where: { ky_thi_id: exam.id },
      order: [["thoi_gian_nop", "DESC"]],
    });

    const submissions = await Promise.all(
      attempts.map(async (attempt) => {
        const student = await User.findByPk(attempt.sinh_vien_id, {
          attributes: ["id", "mssv", "ho_ten"],
          raw: true,
        });

        const correctAnswers = await ChiTietBaiLam.count({
          where: {
            bai_lam_id: attempt.id,
            dung_sai: true,
          },
        });

        const start = attempt.thoi_gian_bat_dau ? new Date(attempt.thoi_gian_bat_dau).getTime() : null;
        const submit = attempt.thoi_gian_nop ? new Date(attempt.thoi_gian_nop).getTime() : null;
        const totalTime = start && submit && submit >= start ? Math.round((submit - start) / 60000) : 0;

        return {
          id: attempt.id,
          studentId: student?.mssv || `ID-${attempt.sinh_vien_id}`,
          studentName: student?.ho_ten || "Không xác định",
          submitTime: attempt.thoi_gian_nop || attempt.updatedAt,
          score: attempt.tong_diem,
          totalQuestions,
          correctAnswers,
          totalTime,
          status: attempt.tong_diem === null ? "Chờ chấm" : "Đã chấm",
        };
      })
    );

    const graded = submissions.filter((item) => item.score !== null).length;
    const pending = submissions.length - graded;

    return res.status(200).json({
      exam: {
        id: exam.id,
        name: exam.ten_ky_thi,
        hinh_thuc_thi: examConfig?.hinh_thuc_thi || "online",
        totalQuestions,
      },
      stats: {
        submissions: submissions.length,
        graded,
        pending,
      },
      submissions,
    });
  } catch (error) {
    console.error("getExamGradingResults error:", error);
    return res.status(500).json({ message: "Lỗi khi lấy dữ liệu chấm bài" });
  }
};

export const downloadOmrExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { ma_de } = req.query;

    const exam = await KyThi.findByPk(id);
    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy kỳ thi" });
    }

    const lop = await LopHoc.findByPk(exam.lop_id, { raw: true });
    const config = await CauHinhKyThi.findOne({
      where: { ky_thi_id: id },
      raw: true,
    });

    if (!config || config.hinh_thuc_thi !== "omr") {
      return res.status(400).json({ message: "Kỳ thi này không ở chế độ OMR" });
    }

    const structure = await resolveOmrExamStructure(exam.id, config, ma_de);
    const questions = await CauHoi.findAll({
      where: { id: { [Op.in]: structure.questionIds } },
      attributes: ["id", "noi_dung", "dap_an_a", "dap_an_b", "dap_an_c", "dap_an_d", "dap_an_dung"],
      raw: true,
    });

    const questionMap = new Map(questions.map((item) => [Number(item.id), item]));

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    const selectedFont = resolvePdfFontPath();

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const base = safeFileName(`${exam.ten_ky_thi}_${lop?.ten_lop || "omr"}_${structure.maDe || "mau"}`);
      attachPdfResponse(res, chunks, `${base}.pdf`);
    });

    setPdfFont(doc, selectedFont);
    doc.fontSize(18).text("ĐỀ THI TRẮC NGHIỆM", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(14).text(exam.ten_ky_thi || "", { align: "center" });
    doc.moveDown(0.2);
    doc.fontSize(11).text(`Lớp: ${lop?.ten_lop || ""}`, { align: "center" });
    doc.fontSize(11).text(`Mã đề: ${structure.maDe || "Mẫu"}`, { align: "center" });
    doc.fontSize(11).text(`Thời gian: ${exam.thoi_gian_lam_bai} phút`, { align: "center" });
    doc.moveDown();

    const answerByLetter = {
      A: "dap_an_a",
      B: "dap_an_b",
      C: "dap_an_c",
      D: "dap_an_d",
    };

    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    structure.questionIds.forEach((questionId, index) => {
      const question = questionMap.get(questionId);
      if (!question) return;

      if (doc.y > doc.page.height - doc.page.margins.bottom - 110) {
        doc.addPage();
        setPdfFont(doc, selectedFont);
      }

      doc.fontSize(11).text(`${index + 1}. ${question.noi_dung || ""}`, {
        width: contentWidth,
      });

      ANSWER_LETTERS.forEach((letter) => {
        const fieldName = answerByLetter[letter];
        const optionText = question[fieldName] || "";
        doc.fontSize(10).text(`${letter}. ${optionText}`, {
          indent: 18,
          width: contentWidth,
        });
      });

      doc.moveDown(0.45);
    });

    doc.end();
  } catch (error) {
    console.error("downloadOmrExam error:", error);
    return res.status(500).json({ message: error.message || "Lỗi khi tải đề OMR" });
  }
};

export const downloadOmrSheet = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await KyThi.findByPk(id);
    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy kỳ thi" });
    }

    const config = await CauHinhKyThi.findOne({
      where: { ky_thi_id: id },
      raw: true,
    });

    if (!config || config.hinh_thuc_thi !== "omr") {
      return res.status(400).json({ message: "Kỳ thi này không ở chế độ OMR" });
    }

    const totalQuestions = config.tong_so_cau || (await CauHoiKyThi.count({ where: { ky_thi_id: exam.id } }));
    const maDeCodes = Array.isArray(config.ma_de_data)
      ? config.ma_de_data.map((item) => item?.ma_de).filter(Boolean)
      : [];

    const doc = new PDFDocument({ bufferPages: true, size: "A4", margin: 24 });
    const chunks = [];
    const selectedFont = resolvePdfFontPath();

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      attachPdfResponse(res, chunks, `phieu-omr-${exam.id}.pdf`);
    });

    const drawAlignmentMarkers = () => {
      const markerSize = 8;
      const left = doc.page.margins.left;
      const top = doc.page.margins.top;
      const right = doc.page.width - doc.page.margins.right;
      const bottom = doc.page.height - doc.page.margins.bottom;

      doc.rect(left - markerSize / 2, top - markerSize / 2, markerSize, markerSize).fill("black");
      doc.rect(right - markerSize / 2, top - markerSize / 2, markerSize, markerSize).fill("black");
      doc.rect(left - markerSize / 2, bottom - markerSize / 2, markerSize, markerSize).fill("black");
      doc.rect(right - markerSize / 2, bottom - markerSize / 2, markerSize, markerSize).fill("black");
      doc.fillColor("black");
    };

    // Helper to draw anchor points at 4 corners of a box
    const drawAnchorPoints = (boxX, boxY, boxWidth, boxHeight) => {
      const anchorSize = 6; // Size of anchor point squares
      doc.fillColor("black");
      
      // Top-left
      doc.rect(boxX - anchorSize / 2, boxY - anchorSize / 2, anchorSize, anchorSize).fill();
      // Top-right
      doc.rect(boxX + boxWidth - anchorSize / 2, boxY - anchorSize / 2, anchorSize, anchorSize).fill();
      // Bottom-left
      doc.rect(boxX - anchorSize / 2, boxY + boxHeight - anchorSize / 2, anchorSize, anchorSize).fill();
      // Bottom-right
      doc.rect(boxX + boxWidth - anchorSize / 2, boxY + boxHeight - anchorSize / 2, anchorSize, anchorSize).fill();
    };

    const drawDigitBubbleGrid = ({
      x,
      y,
      boxWidth,
      boxHeight,
      title,
      digitColumns,
      bubbleShiftX = 0,
      hasInputFields = false,
      edgeGap = 10, // Gap between bubble edges (default 10px)
      topPadding = 30, // Top padding from box border
      inputBoxTopGap = 12, // Gap between input squares and first bubble row
    }) => {
      // ===== SBD/MA DE BUBBLE GRID LAYOUT =====
      // Padding and spacing configurable per box
      const bottomPadding = 30; // Bottom padding from box border
      const bubbleRadius = 5; // Bubble size
      const centerSpacing = 2 * bubbleRadius + edgeGap; // Distance between bubble centers
      const boxSize = 14; // Input box size for SBD
      const rowCount = 10; // 0..9

      // Calculate available height for bubble grid
      const availableHeight = boxHeight - topPadding - bottomPadding; // Space available for bubbles
      const bubbleGridContentHeight = (rowCount - 1) * centerSpacing + 2 * bubbleRadius; // Height just for bubbles
      const inputHeight = hasInputFields ? boxSize + inputBoxTopGap : 0; // Height for input boxes
      const totalNeededHeight = inputHeight + bubbleGridContentHeight;

      // Calculate content width for bubbles
      const bubbleGridWidth = (digitColumns - 1) * centerSpacing + 2 * bubbleRadius;

      // Center content horizontally within box
      const contentCenterX = x + boxWidth / 2 + bubbleShiftX;
      const firstBubbleCenterX = contentCenterX - bubbleGridWidth / 2;
      const bubbleStartX = firstBubbleCenterX;

      // Position content vertically: input boxes at top, then bubbles
      const inputBoxY = y + topPadding;
      const bubbleStartY = y + topPadding + inputHeight;

      doc.fontSize(11).text(title, x, y + 6, { width: boxWidth, align: "center" });

      // Draw input squares (aligned with bubble centers)
      if (hasInputFields) {
        for (let col = 0; col < digitColumns; col += 1) {
          const centerX = bubbleStartX + col * centerSpacing;
          const boxX = centerX - boxSize / 2;
          doc.rect(boxX, inputBoxY, boxSize, boxSize).stroke();
        }
      }

      // Draw bubble grid (0-9 with one number per row)
      for (let row = 0; row < rowCount; row += 1) {
        const centerY = bubbleStartY + row * centerSpacing;

        // Draw bubbles for each column in this row
        for (let col = 0; col < digitColumns; col += 1) {
          const centerX = bubbleStartX + col * centerSpacing;
          doc.circle(centerX, centerY, bubbleRadius).stroke();
          // Draw number inside bubble
          doc.fontSize(8).text(String(row), centerX - bubbleRadius, centerY - 4.5, {
            width: bubbleRadius * 2,
            align: "center",
          });
        }
      }
    };

    const drawHeader = () => {
      setPdfFont(doc, selectedFont);
      drawAlignmentMarkers();

      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const width = right - left;

      doc.fontSize(18).text("PHIẾU TRẢ LỜI TRẮC NGHIỆM", left, 24, { width, align: "center" });
      doc.fontSize(10).text(`Kỳ thi: ${exam.ten_ky_thi || "................................"}`, left, 52, {
        width: width * 0.6,
        align: "left",
      });
      doc.text("Ngày thi: ....../....../20....", left + width * 0.42, 52, {
        width: width * 0.25,
        align: "left",
      });

      // ===== INFO SECTION LAYOUT =====
      const infoTop = 74; // Y position of info box start
      const leftInfoWidth = width * 0.56; // Width of left info panel
      const rightInfoX = left + leftInfoWidth + 10; // X position of right panels (SBD, Ma de)
      const rightInfoWidth = width - leftInfoWidth - 10; // Total width of SBD + Ma de area
      const rightInnerGap = 10; // Gap between SBD and Ma de boxes
      const infoBoxHeight = 250; // Info fields box height
      const sbdBoxWidth = (rightInfoWidth - rightInnerGap) * 0.65; // Width of SBD box
      const maDeBoxWidth = rightInfoWidth - rightInnerGap - sbdBoxWidth; // Width of Ma de box
      // SBD and Ma de boxes height: 250px
      const digitBoxHeight = 250; // SBD and Ma de box height

      // ===== INFO FIELDS LAYOUT =====
      const drawInputLine = (label, y) => {
        const labelX = left + 12; // Label left margin
        const lineStartX = left + 100; // Dotted line start (longer for wider fields)
        const lineEndX = left + leftInfoWidth - 14; // Dotted line end

        doc.fontSize(11).text(`${label}:`, labelX, y);
        doc
          .moveTo(lineStartX, y + 13)
          .lineTo(lineEndX, y + 13)
          .dash(1.2, { space: 2 })
          .stroke()
          .undash();
      };

      doc.rect(left, infoTop, leftInfoWidth, infoBoxHeight).stroke();
      // Vertical spacing between fields: 18-20px (compact but readable)
      drawInputLine("Họ tên thí sinh", infoTop + 8);
      drawInputLine("MSSV", infoTop + 26);
      drawInputLine("Lớp", infoTop + 44);
      drawInputLine("Phòng thi", infoTop + 62);
      drawInputLine("Chữ ký thí sinh", infoTop + 80);

      // Signature areas for invigilators: balanced left/right like a signing block
      const signatureBlockWidth = 120;
      const signatureInset = 14;
      const signatureTitleY = infoTop + infoBoxHeight - 143; // Move title up an extra 30px
      const signatureNoteY = signatureTitleY + 14;
      const signatureLineY = signatureTitleY + 100; // Keep 100px gap between title and dotted line
      const signatureLeftX = left + signatureInset;
      const signatureRightX = left + leftInfoWidth - signatureInset - signatureBlockWidth;

      doc.fontSize(10).text("Cán bộ coi thi 1", signatureLeftX, signatureTitleY, {
        width: signatureBlockWidth,
        align: "center",
      });
      doc.text("Cán bộ coi thi 2", signatureRightX, signatureTitleY, {
        width: signatureBlockWidth,
        align: "center",
      });

      doc.fontSize(8).text("(Ký, ghi rõ họ tên)", signatureLeftX, signatureNoteY, {
        width: signatureBlockWidth,
        align: "center",
      });
      doc.text("(Ký, ghi rõ họ tên)", signatureRightX, signatureNoteY, {
        width: signatureBlockWidth,
        align: "center",
      });

      doc
        .moveTo(signatureLeftX + 6, signatureLineY)
        .lineTo(signatureLeftX + signatureBlockWidth - 6, signatureLineY)
        .dash(1.2, { space: 2 })
        .stroke()
        .undash();
      doc
        .moveTo(signatureRightX + 6, signatureLineY)
        .lineTo(signatureRightX + signatureBlockWidth - 6, signatureLineY)
        .dash(1.2, { space: 2 })
        .stroke()
        .undash();

      doc.rect(rightInfoX, infoTop, sbdBoxWidth, infoBoxHeight).stroke();
      drawAnchorPoints(rightInfoX, infoTop, sbdBoxWidth, infoBoxHeight);
      
      doc.rect(rightInfoX + sbdBoxWidth + rightInnerGap, infoTop, maDeBoxWidth, infoBoxHeight).stroke();
      drawAnchorPoints(rightInfoX + sbdBoxWidth + rightInnerGap, infoTop, maDeBoxWidth, infoBoxHeight);

      drawDigitBubbleGrid({
        x: rightInfoX,
        y: infoTop,
        boxWidth: sbdBoxWidth,
        boxHeight: digitBoxHeight,
        title: "Số báo danh",
        digitColumns: 5,
        hasInputFields: true,
        edgeGap: 10.5, // Slightly wider spacing for cleaner look
        topPadding: 30,
        inputBoxTopGap: 12,
      });
      drawDigitBubbleGrid({
        x: rightInfoX + sbdBoxWidth + rightInnerGap,
        y: infoTop,
        boxWidth: maDeBoxWidth,
        boxHeight: digitBoxHeight,
        title: "Mã đề thi",
        digitColumns: 3,
        bubbleShiftX: 0,
        hasInputFields: true, // Add 3 input squares aligned with bubble columns
        edgeGap: 10.5, // Slightly wider spacing for cleaner look
        topPadding: 30,
        inputBoxTopGap: 12,
      });

      doc.fontSize(9).text("Chú ý: Tô màu kín một ô cho mỗi câu trả lời.", left, infoTop + digitBoxHeight + 8, {
        width,
        align: "center",
      });

      return infoTop + digitBoxHeight + 26;
    };

    const drawAnswers = (startQuestion, endQuestion, startY) => {
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      
      // ===== ANSWER GRID LAYOUT (60 QUESTIONS: 20 PER COLUMN, 3 COLUMNS) =====
      const answerPadding = 10; // Padding around answer grid
      const answerLeft = left + answerPadding;
      const answerRight = right - answerPadding;
      const availableWidth = answerRight - answerLeft;
      
      const columnCount = 3; // Three answer columns
      const columnGap = 10; // Gap between columns (10px)
      const columnWidth = (availableWidth - columnGap * (columnCount - 1)) / columnCount;
      
      const rowsPerColumn = 20; // 20 questions per column
      const headerHeight = 26; // Header (A, B, C, D labels)
      const bubbleRadius = 5; // Answer bubble size
      const answerEdgeGap = 5; // Gap between bubble edges (5px horizontal A-B-C-D and vertical row spacing)
      const rowHeight = answerEdgeGap + 2 * bubbleRadius; // Row spacing: 5px gap + 10px diameter = 15px center-to-center
      
      const numberColumnWidth = 25; // Question number width
      const numberBubbleGap = 10; // Gap between number and first bubble
      const bubblesAreaPadding = 6; // Keep bubbles away from left/right border for visual balance
      const bubblesAreaStartX = numberColumnWidth + numberBubbleGap + bubblesAreaPadding;
      const availableForBubbles = columnWidth - numberColumnWidth - numberBubbleGap - 2 * bubblesAreaPadding; // Width for 4 bubbles area
      const bubbleSpacing = (availableForBubbles - 2 * bubbleRadius) / 3; // Center-to-center spacing so D stays inside the box

      // Draw overall answer grid and anchor points
      const boxHeight = headerHeight + rowsPerColumn * rowHeight + 10; // Box height for all columns
      drawAnchorPoints(answerLeft, startY, availableWidth, boxHeight);

      for (let col = 0; col < columnCount; col += 1) {
        const colX = answerLeft + col * (columnWidth + columnGap); // Column left position
        const columnBoxHeight = headerHeight + rowsPerColumn * rowHeight + 10; // Box height
        doc.rect(colX, startY, columnWidth, columnBoxHeight).stroke(); // Draw column border

        // Header row: A, B, C, D labels
        const bubbleHeaderX = colX + bubblesAreaStartX + bubbleRadius; // First bubble center X
        doc.fontSize(11).text("A", bubbleHeaderX - 5, startY + 6, { width: 10, align: "center" });
        doc.text("B", bubbleHeaderX + bubbleSpacing - 5, startY + 6, { width: 10, align: "center" });
        doc.text("C", bubbleHeaderX + bubbleSpacing * 2 - 5, startY + 6, { width: 10, align: "center" });
        doc.text("D", bubbleHeaderX + bubbleSpacing * 3 - 5, startY + 6, { width: 10, align: "center" });

        // Question rows (1-20 per column)
        for (let row = 0; row < rowsPerColumn; row += 1) {
          const questionNo = startQuestion + col * rowsPerColumn + row;
          if (questionNo > endQuestion) break;

          const rowCenterY = startY + headerHeight + bubbleRadius + row * rowHeight; // Row center Y
          
          // Question number (right-aligned in number column)
          doc.fontSize(10).text(String(questionNo), colX + 2, rowCenterY - 4.5, {
            width: numberColumnWidth - 4,
            align: "right",
          });

          // Answer bubbles (A, B, C, D) with 10px spacing between rows
          for (let option = 0; option < 4; option += 1) {
            const bubbleX = bubbleHeaderX + option * bubbleSpacing;
            doc.circle(bubbleX, rowCenterY, bubbleRadius).stroke();
          }
        }
      }
    };

    setPdfFont(doc, selectedFont);
    const questionsPerPage = 60;
    const pageCount = 1;

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      if (pageIndex > 0) {
        doc.addPage();
        setPdfFont(doc, selectedFont);
      }

      const gridStartY = drawHeader();
      const startQuestion = 1;
      const endQuestion = questionsPerPage;
      drawAnswers(startQuestion, endQuestion, gridStartY);

      doc.fontSize(9).text(`Mã đề hợp lệ: ${maDeCodes.join(", ") || "001"}`, doc.page.margins.left, doc.page.height - 30, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: "center",
      });
    }

    doc.end();
  } catch (error) {
    console.error("downloadOmrSheet error:", error);
    return res.status(500).json({ message: error.message || "Lỗi khi tải phiếu OMR" });
  }
};

export const uploadOmrImage = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await KyThi.findByPk(id);

    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy kỳ thi" });
    }

    const config = await CauHinhKyThi.findOne({
      where: { ky_thi_id: id },
      raw: true,
    });

    if (!config || config.hinh_thuc_thi !== "omr") {
      return res.status(400).json({ message: "Kỳ thi này không ở chế độ OMR" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn ảnh phiếu OMR" });
    }

    const fileRecord = await FileOMR.create({
      ky_thi_id: exam.id,
      ten_file: req.file.originalname,
      duong_dan: `/uploads/omr/${req.file.filename}`,
      ngay_tai_len: new Date(),
    });

    let scanPayload = extractAutoGradePayloadFromBody(req.body);
    let scanErrorMessage = null;

    if (!scanPayload) {
      try {
        scanPayload = await requestAutoScanPayloadWithLocalFallback({
          examId: exam.id,
          fileRecord,
        });
      } catch (scanError) {
        scanErrorMessage = scanError.message;
      }
    }

    if (!scanPayload) {
      const scannerConfigured = Boolean(process.env.OMR_SCANNER_API_URL);

      return res.status(scannerConfigured ? 502 : 202).json({
        message: scannerConfigured
          ? "Đã tải ảnh nhưng quét tự động thất bại, chưa chấm điểm"
          : "Đã tải ảnh nhưng chưa có dữ liệu quét để tự chấm điểm",
        file: {
          id: fileRecord.id,
          ten_file: fileRecord.ten_file,
          duong_dan: fileRecord.duong_dan,
        },
        auto_grade: {
          status: scannerConfigured ? "failed" : "pending",
          reason:
            scanErrorMessage ||
            "Cần gửi mssv/ma_de/answers hoặc cấu hình OMR_SCANNER_API_URL để backend tự quét",
        },
      });
    }

    const gradingResult = await gradeOmrAttempt({
      examId: exam.id,
      fileOmrId: fileRecord.id,
      mssv: scanPayload.mssv,
      maDe: scanPayload.maDe,
      answersInput: scanPayload.answersInput,
    });

    return res.status(201).json({
      message: "Đã tải ảnh OMR, tự động chấm điểm và lưu kết quả",
      file: {
        id: fileRecord.id,
        ten_file: fileRecord.ten_file,
        duong_dan: fileRecord.duong_dan,
      },
      auto_grade: {
        status: "graded",
      },
      result: gradingResult,
    });
  } catch (error) {
    console.error("uploadOmrImage error:", error);
    return res.status(500).json({ message: error.message || "Lỗi khi tải ảnh OMR" });
  }
};

export const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await KyThi.findByPk(id);
    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy kỳ thi" });
    }

    const attemptsCount = await BaiLam.count({ where: { ky_thi_id: exam.id } });
    if (attemptsCount > 0) {
      return res.status(409).json({
        message: "Không thể xóa kỳ thi đã có bài làm của sinh viên",
      });
    }

    const omrFiles = await FileOMR.findAll({
      where: { ky_thi_id: exam.id },
      attributes: ["id", "duong_dan"],
      raw: true,
    });

    const omrFileIds = omrFiles.map((file) => file.id);
    const tx = await sequelize.transaction();

    try {
      if (omrFileIds.length > 0) {
        await KetQuaOMR.destroy({
          where: { file_omr_id: { [Op.in]: omrFileIds } },
          transaction: tx,
        });
      }

      await FileOMR.destroy({
        where: { ky_thi_id: exam.id },
        transaction: tx,
      });

      await CauHoiKyThi.destroy({
        where: { ky_thi_id: exam.id },
        transaction: tx,
      });

      await CauHinhKyThi.destroy({
        where: { ky_thi_id: exam.id },
        transaction: tx,
      });

      await KyThi.destroy({
        where: { id: exam.id },
        transaction: tx,
      });

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }

    for (const file of omrFiles) {
      try {
        if (!file.duong_dan) continue;
        const normalizedPath = file.duong_dan.replace(/^\/+/, "");
        const absolutePath = path.resolve(normalizedPath);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (fileError) {
        console.warn("deleteExam file cleanup warning:", fileError.message);
      }
    }

    return res.status(200).json({ message: "Đã xóa kỳ thi thành công" });
  } catch (error) {
    console.error("deleteExam error:", error);
    return res.status(500).json({ message: "Lỗi khi xóa kỳ thi" });
  }
};
