import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load layout configuration
const loadLayoutConfig = () => {
  try {
    const configPath = path.join(__dirname, '../../omr_layout_config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`   ✓ Đã load cấu hình layout từ ${path.basename(configPath)}`);
      return config;
    }
  } catch (err) {
    console.warn(`   ⚠ Không thể load layout config:`, err.message);
  }
  return null;
};

/**
 * Detect OMR markings: student ID, exam code, and answer bubbles
 * Returns: { mssv, maDe, answers: ['A', 'B', 'C', 'D', ...] }
 */
export const detectOMRMarkings = async (imagePath) => {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Ảnh OMR không tồn tại: ${imagePath}`);
  }

  try {
    // Đọc ảnh gốc
    const imageBuffer = fs.readFileSync(imagePath);
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    console.log(`📸 Kích thước ảnh gốc: ${metadata.width}x${metadata.height}`);

    // Normalize ảnh: chuyển sang RGB nếu cần
    let normalizedBuffer = imageBuffer;
    if (metadata.format !== 'jpeg' && metadata.format !== 'png') {
      normalizedBuffer = await sharp(imageBuffer)
        .png()
        .toBuffer();
    }

    // === Tính toán layout dựa trên kích thước ảnh ===
    // Giả sử A4 được scan ở ~300 DPI: ~2480x3508px
    // Với margin 24pt, vùng OMR chiếm khoảng 85% trang
    const layoutScale = metadata.width / 2480; // Tỷ lệ so với A4 @300dpi
    
    const layout = {
      pageWidth: metadata.width,
      pageHeight: metadata.height,
      marginTop: Math.round(50 * layoutScale),
      marginLeft: Math.round(50 * layoutScale),
      sectionWidth: Math.round(metadata.width * 0.45),
      sectionHeight: Math.round(metadata.height * 0.75),
      sbdHeight: Math.round(250 * layoutScale),
      madeHeight: Math.round(150 * layoutScale),
      answerGridRows: 20,
      answerGridCols: 3,
    };

    // === STEP 1: Detect SBD (Số Báo Danh) ===
    console.log('🔍 Quét số báo danh từ ảnh...');
    const mssv = await detectStudentNumber(normalizedBuffer, metadata, layout);

    // === STEP 2: Detect Mã Đề ===
    console.log('🔍 Quét mã đề từ ảnh...');
    const maDe = await detectExamCode(normalizedBuffer, metadata, layout);

    // === STEP 3: Detect Answers (60 câu hỏi, A-D) ===
    console.log('🔍 Quét đáp án từ ảnh...');
    const answers = await detectAnswerBubbles(normalizedBuffer, metadata, layout);

    return {
      mssv: mssv || generatePlaceholder(5),
      maDe: maDe || generatePlaceholder(3),
      answers: answers || new Array(60).fill(null),
    };
  } catch (error) {
    console.error('❌ Lỗi khi quét OMR:', error.message);
    throw error;
  }
};

/**
 * Detect student number from SBD area using BUBBLE DETECTION
 * Layout (exact from examController):
 * - infoTop = 74px
 * - leftInfoWidth = width * 0.56
 * - rightInfoX = left (50px) + leftInfoWidth + 10
 * - sbdBoxWidth = (rightInfoWidth - 10) * 0.65
 * - SBD has 5 bubble columns (digits 0-9)
 */
const detectStudentNumber = async (imageBuffer, metadata, layout) => {
  try {
    // Layout calculations (from examController)
    const left = 50; // margin ~24pt @ 300dpi
    const pageWidth = metadata.width;
    const totalWidth = pageWidth - 2 * left;
    const leftInfoWidth = totalWidth * 0.56;
    const rightInfoX = left + leftInfoWidth + 10;
    const rightInfoWidth = totalWidth - leftInfoWidth - 10;
    const sbdBoxWidth = (rightInfoWidth - 10) * 0.65;
    const sbdBoxHeight = 250;
    const infoTop = 74;
    
    // SBD grid params (5 columns, 10 rows)
    const digitColumns = 5;
    const edgeGap = 10.5;
    const topPadding = 30;
    const bubbleRadius = 5;
    const centerSpacing = (sbdBoxWidth - 2 * edgeGap) / digitColumns;

    // Crop SBD region
    const sbdBuffer = await sharp(imageBuffer)
      .extract({
        left: Math.round(rightInfoX),
        top: Math.round(infoTop),
        width: Math.round(sbdBoxWidth),
        height: Math.round(sbdBoxHeight),
      })
      .toBuffer();

    // Detect filled bubbles (0-4 for digit columns)
    const sbd = await detectDigitBubbles(sbdBuffer, digitColumns);
    
    if (sbd && sbd.length > 0) {
      const result = sbd.join('');
      console.log(`   ✓ SBD quét được: "${result}"`);
      return result;
    }
    
    return null;
  } catch (error) {
    console.warn(`   ⚠️  Không quét được SBD: ${error.message}`);
    return null;
  }
};

/**
 * Detect exam code from Mã Đề area using BUBBLE DETECTION
 * Layout (exact from examController):
 * - rightInfoX + sbdBoxWidth + 10 (right of SBD)
 * - Mã đề has 3 bubble columns (digits 0-9)
 */
const detectExamCode = async (imageBuffer, metadata, layout) => {
  try {
    // Layout calculations (from examController)
    const left = 50; // margin ~24pt @ 300dpi
    const pageWidth = metadata.width;
    const totalWidth = pageWidth - 2 * left;
    const leftInfoWidth = totalWidth * 0.56;
    const rightInfoX = left + leftInfoWidth + 10;
    const rightInfoWidth = totalWidth - leftInfoWidth - 10;
    const sbdBoxWidth = (rightInfoWidth - 10) * 0.65;
    const rightInnerGap = 10;
    const madeBoxWidth = rightInfoWidth - rightInnerGap - sbdBoxWidth;
    const madeBoxHeight = 250;
    const infoTop = 74;
    
    // Ma de grid params (3 columns, 10 rows)
    const digitColumns = 3;
    
    // Crop Ma de region
    const madeBuffer = await sharp(imageBuffer)
      .extract({
        left: Math.round(rightInfoX + sbdBoxWidth + rightInnerGap),
        top: Math.round(infoTop),
        width: Math.round(madeBoxWidth),
        height: Math.round(madeBoxHeight),
      })
      .toBuffer();

    // Detect filled bubbles (0-2 for digit columns)
    const maDe = await detectDigitBubbles(madeBuffer, digitColumns);
    
    if (maDe && maDe.length > 0) {
      const result = maDe.join('');
      console.log(`   ✓ Mã Đề quét được: "${result}"`);
      return result;
    }
    
    return null;
  } catch (error) {
    console.warn(`   ⚠️  Không quét được Mã Đề: ${error.message}`);
    return null;
  }
};

/**
 * Detect answer bubbles (60 questions, A-D choices)
 * Grid: 3 columns × 20 rows = 60 questions
 */
const detectAnswerBubbles = async (imageBuffer, metadata, layout) => {
  try {
    // Vị trí grid trả lời: trung tâm/phải trang
    const gridX = Math.round(metadata.width * 0.55);
    const gridY = Math.round(metadata.height * 0.27);
    const gridWidth = Math.round(metadata.width * 0.4);
    const gridHeight = Math.round(metadata.height * 0.6);

    // Crop vùng grid
    const gridBuffer = await sharp(imageBuffer)
      .extract({
        left: gridX,
        top: gridY,
        width: gridWidth,
        height: gridHeight,
      })
      .toBuffer();

    // Xử lý ảnh: grayscale + threshold để detect bubble
    const processedBuffer = await sharp(gridBuffer)
      .grayscale()
      .threshold(150)
      .toBuffer();

    // Phân tích từng bubble
    const answers = [];
    const questionCount = 60;

    for (let qIndex = 0; qIndex < questionCount; qIndex++) {
      const colIndex = Math.floor(qIndex / 20);
      const rowIndex = qIndex % 20;

      // Tính tọa độ bubble
      const bubbleY = Math.round((rowIndex * gridHeight) / 20);
      const colWidth = gridWidth / 3;

      const choicePositions = {
        A: { x: Math.round(colWidth * 0.2), y: bubbleY },
        B: { x: Math.round(colWidth * 0.4), y: bubbleY },
        C: { x: Math.round(colWidth * 0.6), y: bubbleY },
        D: { x: Math.round(colWidth * 0.8), y: bubbleY },
      };

      // Adjust X position dựa trên cột
      for (const choice in choicePositions) {
        choicePositions[choice].x += Math.round(colIndex * colWidth);
      }

      // Detect filled bubble
      const filledChoice = await detectFilledBubble(processedBuffer, choicePositions);
      answers.push(filledChoice);
    }

    const answeredCount = answers.filter(a => a).length;
    console.log(`   ✓ Quét được ${answeredCount}/${questionCount} câu trả lời`);

    return answers;
  } catch (error) {
    console.warn(`   ⚠️  Lỗi khi quét đáp án: ${error.message}`);
    return new Array(60).fill(null);
  }
};

/**
 * Check if bubble is filled (dark pixel detected)
 */
const detectFilledBubble = async (imageBuffer, choicePositions) => {
  try {
    const image = await sharp(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = image;
    const { width, height, channels } = info;
    const radius = 8; // Pixel radius of bubble

    // Hàm check vùng tròn có filled không
    const isBubbleFilled = (centerX, centerY) => {
      let darkPixels = 0;
      let totalPixels = 0;

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (dx * dx + dy * dy > radius * radius) continue; // Circle

          const x = Math.round(centerX + dx);
          const y = Math.round(centerY + dy);

          if (x < 0 || x >= width || y < 0 || y >= height) continue;

          const pixelIndex = (y * width + x) * channels;
          const pixelValue = data[pixelIndex];

          if (pixelValue < 128) darkPixels++;
          totalPixels++;
        }
      }

      // Nếu > 40% bubble là đen → filled
      return darkPixels > totalPixels * 0.4;
    };

    // Check từng choice (A, B, C, D)
    for (const [choice, pos] of Object.entries(choicePositions)) {
      if (isBubbleFilled(pos.x, pos.y)) {
        return choice; // Trả về choice được tô (A, B, C, D)
      }
    }

    return null; // Không có bubble nào được tô
  } catch (error) {
    console.warn(`   ⚠️  Lỗi check bubble: ${error.message}`);
    return null;
  }
};

/**
 * Detect digit bubbles by finding darkest pixel in each column per row
 * Maps to digits 0-9 based on which row has highest darkness
 */
const detectDigitBubbles = async (croppedBuffer, digitColumns) => {
  try {
    const image = await sharp(croppedBuffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = image;
    const { width, height, channels } = info;

    const topPadding = 30;
    const inputBoxHeight = 35;
    const gridStartY = topPadding + inputBoxHeight;
    const gridEndY = height - 10;
    const gridHeight = gridEndY - gridStartY;

    const filledDigits = [];
    const colWidth = width / digitColumns;

    // For each column
    for (let col = 0; col < digitColumns; col++) {
      const colStart = Math.round(col * colWidth + 2);
      const colEnd = Math.round((col + 1) * colWidth - 2);
      const colWidth_actual = colEnd - colStart;

      // Scan each digit row (0-9) and measure darkness
      const digitDarkness = [];

      for (let digit = 0; digit < 10; digit++) {
        // Y range for this digit
        const digitRowY = Math.round(gridStartY + (digit / 10) * gridHeight);
        const digitRowStart = Math.max(gridStartY, digitRowY - 8);
        const digitRowEnd = Math.min(gridEndY, digitRowY + 8);

        let darkPixels = 0;
        let totalPixels = 0;

        for (let y = digitRowStart; y < digitRowEnd; y++) {
          for (let x = colStart; x < colEnd; x++) {
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            const pixelValue = data[y * width + x];
            totalPixels++;
            if (pixelValue < 150) darkPixels++;
          }
        }

        const darkness = totalPixels > 0 ? darkPixels / totalPixels : 0;
        digitDarkness.push({ digit, darkness });
      }

      // Find the digit with highest darkness (that's the filled one)
      const filledDigit = digitDarkness.reduce((max, curr) => 
        curr.darkness > max.darkness ? curr : max
      );

      // Only accept if darkness is significant (> 15%)
      filledDigits.push(filledDigit.darkness > 0.15 ? filledDigit.digit : 0);
    }

    return filledDigits;
  } catch (error) {
    console.warn(`   ⚠️  Lỗi detect digit bubbles: ${error.message}`);
    return new Array(digitColumns).fill(0);
  }
};

/**
 * Perform OCR using Tesseract
 */
const performOCR = async (imageBuffer) => {
  try {
    // Enhance ảnh trước OCR
    const enhancedBuffer = await sharp(imageBuffer)
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(180) // Strengthen contrast
      .toBuffer();

    const result = await Tesseract.recognize(
      enhancedBuffer,
      'eng', // English for numbers
      {
        logger: () => {}, // Suppress logs
      }
    );

    await Tesseract.terminate();

    return result;
  } catch (error) {
    console.error(`   ❌ OCR thất bại: ${error.message}`);
    throw error;
  }
};

/**
 * Generate placeholder when detection fails
 */
const generatePlaceholder = (length) => {
  return '0'.repeat(length);
};

export default {
  detectOMRMarkings,
};

