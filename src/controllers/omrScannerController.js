import { KyThi, CauHinhKyThi, CauHoiKyThi, CauHoi, User, BaiLam, ChiTietBaiLam, KetQuaOMR, FileOMR } from "../models/index.js";
import { Op } from "sequelize";

const ANSWER_LETTERS = ["A", "B", "C", "D"];

const normalizeAnswerChoice = (choice) => {
  if (!choice) return null;
  const normalized = String(choice).trim().toUpperCase();
  return ANSWER_LETTERS.includes(normalized) ? normalized : null;
};

// Helper function for flexible MSSV matching (handles padding mismatches like 0001 vs 00001)
const findStudentByFlexibleMSSV = async (mssv) => {
  if (!mssv) return null;
  
  const trimmedMSSV = String(mssv).trim();
  
  // Strategy 1: Try exact match first
  let student = await User.findOne({
    where: { mssv: trimmedMSSV },
    attributes: ["id", "mssv", "ho_ten"],
    raw: true,
  });
  
  if (student) return student;
  
  // Strategy 2: Try left-padding to 5 digits (most common MSSV format)
  const paddedMSSV = trimmedMSSV.padStart(5, "0");
  if (paddedMSSV !== trimmedMSSV) {
    student = await User.findOne({
      where: { mssv: paddedMSSV },
      attributes: ["id", "mssv", "ho_ten"],
      raw: true,
    });
    if (student) return student;
  }
  
  // Strategy 3: Try removing leading zeros (in case detector returned padded version)
  const unpadded = trimmedMSSV.replace(/^0+/, "") || "0";
  if (unpadded !== trimmedMSSV) {
    student = await User.findOne({
      where: { mssv: unpadded },
      attributes: ["id", "mssv", "ho_ten"],
      raw: true,
    });
    if (student) return student;
  }
  
  return null;
};

export const processScanResult = async (req, res) => {
  try {
    const { ky_thi_id, file_omr_id, mssv, ma_de, answers } = req.body;

    if (!ky_thi_id || !mssv || !ma_de || !answers) {
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc: ky_thi_id, mssv, ma_de, answers",
      });
    }

    const exam = await KyThi.findByPk(ky_thi_id);
    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy kỳ thi" });
    }

    const examConfig = await CauHinhKyThi.findOne({
      where: { ky_thi_id },
      raw: true,
    });

    if (!examConfig || examConfig.hinh_thuc_thi !== "omr") {
      return res.status(400).json({ message: "Kỳ thi này không ở chế độ OMR" });
    }

    const student = await findStudentByFlexibleMSSV(mssv);

    if (!student) {
      return res.status(404).json({ 
        message: `Không tìm thấy sinh viên MSSV: ${mssv}. Vui lòng kiểm tra lại định dạng MSSV.` 
      });
    }

    const normalizedAnswers = Array.isArray(answers)
      ? answers.map(normalizeAnswerChoice).filter((a) => a !== null)
      : String(answers)
          .split(/[,;]/)
          .map((a) => normalizeAnswerChoice(a))
          .filter((a) => a !== null);

    const questionIds = await CauHoiKyThi.findAll({
      where: { ky_thi_id },
      attributes: ["cau_hoi_id"],
      order: [["id", "ASC"]],
      raw: true,
    });

    if (questionIds.length === 0) {
      return res.status(400).json({ message: "Kỳ thi chưa có câu hỏi" });
    }

    const questions = await CauHoi.findAll({
      where: { id: { [Op.in]: questionIds.map((q) => q.cau_hoi_id) } },
      attributes: ["id", "dap_an_dung"],
      order: [["id", "ASC"]],
      raw: true,
    });

    if (normalizedAnswers.length !== questions.length) {
      return res.status(400).json({
        message: `Số đáp án không khớp. Kỹ năng quét: ${normalizedAnswers.length}, câu hỏi: ${questions.length}`,
      });
    }

    let correctCount = 0;
    const answerDetails = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const studentAnswer = normalizedAnswers[i];
      const correctAnswer = normalizeAnswerChoice(question.dap_an_dung);

      const isCorrect = studentAnswer === correctAnswer;
      if (isCorrect) correctCount++;

      answerDetails.push({
        question_id: question.id,
        student_answer: studentAnswer,
        correct_answer: correctAnswer,
        is_correct: isCorrect,
      });
    }

    const startTime = exam.thoi_gian_bat_dau;
    const now = new Date();
    const endTime = new Date(startTime.getTime() + exam.thoi_gian_lam_bai * 60000);

    const totalQuestions = questions.length;
    const scorePerQuestion = (examConfig.diem_toi_da || 10) / totalQuestions;
    const finalScore = parseFloat((correctCount * scorePerQuestion).toFixed(2));

    const bailam = await BaiLam.create({
      ky_thi_id,
      sinh_vien_id: student.id,
      thoi_gian_bat_dau: startTime,
      thoi_gian_nop: now > endTime ? endTime : now,
      tong_diem: finalScore,
      trang_thai: "Đã nộp",
    });

    for (const detail of answerDetails) {
      await ChiTietBaiLam.create({
        bai_lam_id: bailam.id,
        cau_hoi_id: detail.question_id,
        dap_an_student: detail.student_answer,
        dap_an_dung: detail.correct_answer,
        dung_sai: detail.is_correct,
      });
    }

    if (file_omr_id) {
      await KetQuaOMR.create({
        file_omr_id,
        bai_lam_id: bailam.id,
        so_cau_dung: correctCount,
        tong_so_cau: totalQuestions,
        diem: finalScore,
        ma_de,
      });
    }

    return res.status(200).json({
      message: "Đã xử lý kết quả quét OMR và cập nhật kết quả",
      result: {
        bai_lam_id: bailam.id,
        sinh_vien_id: student.id,
        mssv: student.mssv,
        ho_ten: student.ho_ten,
        ma_de,
        so_cau_dung: correctCount,
        tong_so_cau: totalQuestions,
        diem: finalScore,
      },
    });
  } catch (error) {
    console.error("processScanResult error:", error);
    return res.status(500).json({ message: error.message || "Lỗi khi xử lý kết quả quét OMR" });
  }
};

export const uploadOmrImageOnly = async (req, res) => {
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

    return res.status(201).json({
      message: "Đã tải ảnh OMR. Chờ Python module quét kết quả...",
      file: {
        id: fileRecord.id,
        ten_file: fileRecord.ten_file,
        duong_dan: fileRecord.duong_dan,
      },
      next_step: "Python module sẽ quét MSSV/mã đề/đáp án từ ảnh, rồi gọi /api/omr/process-scan để chấm điểm",
    });
  } catch (error) {
    console.error("uploadOmrImageOnly error:", error);
    return res.status(500).json({ message: error.message || "Lỗi khi tải ảnh OMR" });
  }
};
