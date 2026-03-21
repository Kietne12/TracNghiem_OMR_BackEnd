import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced OMR Detector with Anchor Point Detection & Perspective Correction
 * 
 * Architecture:
 * 1. Detect anchor points (4 black corners at each region)
 * 2. Apply perspective transform to straighten rotated/skewed images
 * 3. Extract ROI for each region (SBD, Mã đề, Answers)
 * 4. Perform per-region detection on corrected ROIs
 */

/**
 * Main detection function with enhancement pipeline
 */
export const detectOMRMarkings = async (imagePath) => {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Ảnh OMR không tồn tại: ${imagePath}`);
  }

  try {
    console.log('\n════════════════════════════════════════');
    console.log('   🔍 ENHANCED OMR DETECTION PIPELINE');
    console.log('════════════════════════════════════════');

    const imageBuffer = fs.readFileSync(imagePath);

    // Normalize orientation first (apply EXIF rotation), then normalize format if needed.
    let normalizedBuffer = await sharp(imageBuffer).rotate().toBuffer();
    let metadata = await sharp(normalizedBuffer).metadata();

    // OMR template in this project is portrait. If input is landscape, rotate to portrait.
    if ((metadata.width || 0) > (metadata.height || 0)) {
      normalizedBuffer = await sharp(normalizedBuffer).rotate(90).toBuffer();
      metadata = await sharp(normalizedBuffer).metadata();
      console.log('   ↻ Ảnh đầu vào đang ngang, đã xoay về dọc để quét OMR');
    }

    if (metadata.format !== 'jpeg' && metadata.format !== 'png') {
      normalizedBuffer = await sharp(normalizedBuffer).png().toBuffer();
      metadata = await sharp(normalizedBuffer).metadata();
    }

    console.log(`   📸 Kích thước ảnh sau chuẩn hóa: ${metadata.width}x${metadata.height}`);

    // Calculate layout scale based on image size
    const layoutScale = metadata.width / 2480; // Assume A4 @ 300dpi
    
    const layoutParams = {
      pageWidth: metadata.width,
      pageHeight: metadata.height,
      layoutScale: layoutScale,
      marginLeft: Math.round(50 * layoutScale),
      marginTop: Math.round(50 * layoutScale),
    };

    // ===== STEP 1: Try to detect anchor points for perspective correction =====
    console.log('\n   📍 STEP 1: Tìm kiếm các điểm neo (anchor points)...');
    const anchorPoints = await detectAnchorPoints(normalizedBuffer, metadata);
    
    let correctedBuffer = normalizedBuffer;
    let perspectiveApplied = false;

    if (anchorPoints && anchorPoints.length >= 4) {
      console.log('   ✓ Tìm thấy 4 điểm neo, áp dụng perspective transform...');
      try {
        correctedBuffer = await applyPerspectiveTransform(
          normalizedBuffer,
          metadata,
          anchorPoints
        );
        perspectiveApplied = true;
        console.log('   ✓ Perspective transform hoàn tất');
      } catch (err) {
        console.warn(`   ⚠ Perspective transform thất bại: ${err.message}`);
        console.log('   → Tiếp tục với ảnh gốc...');
      }
    } else {
      console.log('   ⚠ Không tìm thấy đủ điểm neo (anchor points)');
      console.log('   → Tiếp tục với ảnh gốc (có thể kém chính xác nếu ảnh bị lệch)');
    }

    // ===== STEP 2: Extract ROI for each region =====
    console.log('\n   📐 STEP 2: Trích xuất vùng quan tâm (ROI)...');
    const roiData = await extractRegionROIs(correctedBuffer, metadata, layoutParams);

    // ===== STEP 3: Detect SBD (Student Number) =====
    console.log('\n   🔍 STEP 3: Quét số báo danh...');
    const mssv = await detectStudentNumberEnhanced(roiData.sbd);

    // ===== STEP 4: Detect Mã Đề (Exam Code) =====
    console.log('\n   🔍 STEP 4: Quét mã đề...');
    const maDe = await detectExamCodeEnhanced(roiData.madeDe);

    // ===== STEP 5: Detect Answers =====
    console.log('\n   🔍 STEP 5: Quét đáp án...');
    const answers = await detectAnswersEnhanced(roiData.answers);

    console.log('\n════════════════════════════════════════');
    console.log('   ✅ DETECTION COMPLETE');
    console.log('════════════════════════════════════════\n');

    return {
      mssv: mssv || generatePlaceholder(5),
      maDe: maDe || generatePlaceholder(3),
      answers: answers || new Array(60).fill(null),
      perspectiveApplied: perspectiveApplied,
      anchorsDetected: anchorPoints && anchorPoints.length >= 4,
    };
  } catch (error) {
    console.error('❌ Lỗi khi quét OMR:', error.message);
    throw error;
  }
};

/**
 * Detect anchor points (4 black 6px squares at corners)
 * Returns array of corner points: [topLeft, topRight, bottomLeft, bottomRight]
 */
const detectAnchorPoints = async (imageBuffer, metadata) => {
  try {
    // Giảm kích thước trước khi detect để tăng tốc STEP 1 rõ rệt
    const targetWidth = 900;
    const resizedBuffer = await sharp(imageBuffer)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .grayscale()
      .threshold(110)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = resizedBuffer;
    const { width, height } = info;

    // Tỷ lệ scale để map tọa độ từ ảnh thu nhỏ về ảnh gốc
    const scaleX = metadata.width / width;
    const scaleY = metadata.height / height;

    // Chỉ quét 4 góc, tránh quét toàn ảnh (nhanh hơn rất nhiều)
    const cornerRatio = 0.22;
    const cornerW = Math.max(40, Math.floor(width * cornerRatio));
    const cornerH = Math.max(40, Math.floor(height * cornerRatio));

    const cornerRegions = [
      { name: 'topLeft', x: 0, y: 0, w: cornerW, h: cornerH },
      { name: 'topRight', x: width - cornerW, y: 0, w: cornerW, h: cornerH },
      { name: 'bottomLeft', x: 0, y: height - cornerH, w: cornerW, h: cornerH },
      { name: 'bottomRight', x: width - cornerW, y: height - cornerH, w: cornerW, h: cornerH },
    ];

    const detectedAnchors = [];
    for (const region of cornerRegions) {
      const anchor = findAnchorInCornerRegion(data, width, height, region);
      if (!anchor) continue;

      // Quy đổi về tọa độ ảnh gốc
      detectedAnchors.push({
        x: Math.round(anchor.x * scaleX),
        y: Math.round(anchor.y * scaleY),
        size: anchor.size,
        region: region.name,
      });
    }

    if (detectedAnchors.length < 4) {
      console.log(`   ℹ Tìm được ${detectedAnchors.length}/4 điểm neo ở 4 góc`);
      return null;
    }

    // Bảo đảm thứ tự cố định: TL, TR, BL, BR
    const topLeft = detectedAnchors.find((p) => p.region === 'topLeft');
    const topRight = detectedAnchors.find((p) => p.region === 'topRight');
    const bottomLeft = detectedAnchors.find((p) => p.region === 'bottomLeft');
    const bottomRight = detectedAnchors.find((p) => p.region === 'bottomRight');

    if (!topLeft || !topRight || !bottomLeft || !bottomRight) {
      console.log('   ℹ Một hoặc nhiều góc không tìm được anchor rõ ràng');
      return null;
    }

    const anchorPoints = [topLeft, topRight, bottomLeft, bottomRight];

    console.log(`   ✓ Tìm thấy ${anchorPoints.length}/4 điểm neo:`);
    anchorPoints.forEach((p, i) => {
      console.log(`      [${i}] (${p.x}, ${p.y}) - size: ${p.size}px² - ${p.region}`);
    });

    return anchorPoints;
  } catch (error) {
    console.warn(`   ⚠ Lỗi detect anchor points: ${error.message}`);
    return null;
  }
};

/**
 * Tìm anchor tốt nhất trong một vùng góc bằng connected-components
 */
const findAnchorInCornerRegion = (data, width, height, region) => {
  const xStart = Math.max(0, region.x);
  const yStart = Math.max(0, region.y);
  const xEnd = Math.min(width, region.x + region.w);
  const yEnd = Math.min(height, region.y + region.h);

  const roiW = xEnd - xStart;
  const roiH = yEnd - yStart;
  if (roiW <= 0 || roiH <= 0) return null;

  const visited = new Uint8Array(roiW * roiH);
  const toRoiIndex = (x, y) => (y - yStart) * roiW + (x - xStart);
  const isBlack = (x, y) => data[y * width + x] < 20;

  // Anchor là hình vuông nhỏ, sau resize thường còn khoảng 2x2 -> 8x8 px
  const minArea = 4;
  const maxArea = 220;
  const targetArea = 30;

  let best = null;

  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const ri = toRoiIndex(x, y);
      if (visited[ri] === 1) continue;
      if (!isBlack(x, y)) continue;

      // BFS bằng queue + con trỏ index (không dùng shift để tránh chậm)
      const queue = [[x, y]];
      visited[ri] = 1;
      let qIndex = 0;

      let area = 0;
      let sumX = 0;
      let sumY = 0;

      while (qIndex < queue.length) {
        const [cx, cy] = queue[qIndex];
        qIndex += 1;

        area += 1;
        sumX += cx;
        sumY += cy;

        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < xStart || nx >= xEnd || ny < yStart || ny >= yEnd) continue;
          const nri = toRoiIndex(nx, ny);
          if (visited[nri] === 1) continue;
          visited[nri] = 1;
          if (isBlack(nx, ny)) {
            queue.push([nx, ny]);
          }
        }
      }

      if (area < minArea || area > maxArea) continue;

      const centerX = Math.round(sumX / area);
      const centerY = Math.round(sumY / area);

      const score = Math.abs(area - targetArea);
      if (!best || score < best.score) {
        best = { x: centerX, y: centerY, size: area, score };
      }
    }
  }

  return best ? { x: best.x, y: best.y, size: best.size } : null;
};

/**
 * Apply perspective transform using detected anchor points
 * Simulates image flattening when page is at angle
 */
const applyPerspectiveTransform = async (imageBuffer, metadata, anchorPoints) => {
  try {
    // For this implementation, use simple affine transformation
    // A full homography would need more complex math

    // Estimate rotation angle from anchor point positions
    const topPoints = anchorPoints.slice(0, 2).sort((a, b) => a.x - b.x);
    const angle = Math.atan2(
      topPoints[1].y - topPoints[0].y,
      topPoints[1].x - topPoints[0].x
    ) * 180 / Math.PI;

    console.log(`   📐 Độ xoay ước tính: ${angle.toFixed(1)}°`);

    // Apply rotation correction using Sharp
    if (Math.abs(angle) > 0.5) {
      const correctedBuffer = await sharp(imageBuffer)
        .rotate(angle * -1, { background: { r: 255, g: 255, b: 255 } })
        .toBuffer();

      return correctedBuffer;
    }

    return imageBuffer;
  } catch (error) {
    console.warn(`   ⚠ Perspective transform thất bại: ${error.message}`);
    return imageBuffer; // Return original if transform fails
  }
};

/**
 * Extract ROI data for each region
 * Returns: { sbd: {...}, madeDe: {...}, answers: {...} }
 */
const extractRegionROIs = async (imageBuffer, metadata, layoutParams) => {
  try {
    const { marginLeft, marginTop, layoutScale } = layoutParams;
    const pageWidth = metadata.width;
    const pageHeight = metadata.height;

    // Calculate layout dimensions based on template
    const totalWidth = pageWidth - 2 * marginLeft;
    const leftInfoWidth = totalWidth * 0.56;
    const rightInfoX = marginLeft + leftInfoWidth + 10;
    const rightInfoWidth = totalWidth - leftInfoWidth - 10;
    const sbdBoxWidth = (rightInfoWidth - 10) * 0.65;
    const rightInnerGap = 10;
    const madeBoxWidth = rightInfoWidth - rightInnerGap - sbdBoxWidth;
    // Use page-height ratios for photographed sheets; fixed pixel scaling is unstable here.
    const infoTop = Math.round(pageHeight * 0.14);
    const infoBoxHeight = Math.round(pageHeight * 0.33);

    // Extract SBD region
    console.log(`   → Trích xuất vùng SBD...`);
    const sbdRegion = await sharp(imageBuffer)
      .extract({
        left: Math.round(rightInfoX),
        top: Math.round(infoTop),
        width: Math.round(sbdBoxWidth),
        height: infoBoxHeight,
      })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Extract Mã Đề region
    console.log(`   → Trích xuất vùng Mã Đề...`);
    const makeRegion = await sharp(imageBuffer)
      .extract({
        left: Math.round(rightInfoX + sbdBoxWidth + rightInnerGap),
        top: Math.round(infoTop),
        width: Math.round(madeBoxWidth),
        height: infoBoxHeight,
      })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Extract Answers grid region
    console.log(`   → Trích xuất vùng Đáp án...`);
    const answersGridX = Math.round(marginLeft);
    const answersGridY = Math.round(infoTop + infoBoxHeight + pageHeight * 0.02);
    const answersGridWidth = Math.round(pageWidth - 2 * marginLeft);
    const answersGridHeight = Math.round(pageHeight - answersGridY - marginTop);

    const answersRegion = await sharp(imageBuffer)
      .extract({
        left: answersGridX,
        top: answersGridY,
        width: answersGridWidth,
        height: answersGridHeight,
      })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log(`   ✓ Đã trích xuất 3 vùng ROI`);

    return {
      sbd: sbdRegion,
      madeDe: makeRegion,
      answers: answersRegion,
    };
  } catch (error) {
    console.warn(`   ⚠ Lỗi trích xuất ROI: ${error.message}`);
    throw error;
  }
};

/**
 * Detect student number from SBD ROI (5 columns × 10 rows)
 */
const detectStudentNumberEnhanced = async (roiData) => {
  try {
    const { data, info } = roiData;
    const { width, height, channels } = info;

    const digitColumns = 5;
    const colWidth = width / digitColumns;
    const topPadding = Math.round(height * 0.12); // 12% padding
    const gridStartY = topPadding;
    const gridEndY = height - Math.round(height * 0.04);
    const gridHeight = gridEndY - gridStartY;

    const digits = [];

    // Process each column (digit position)
    for (let col = 0; col < digitColumns; col++) {
      const colStart = Math.round(col * colWidth + 2);
      const colEnd = Math.round((col + 1) * colWidth - 2);
      const colCenterX = Math.round((colStart + colEnd) / 2);
      const rowHeight = gridHeight / 10;
      const bubbleOuterR = Math.max(5, Math.round(Math.min(colWidth, rowHeight) * 0.20));
      const bubbleInnerR = Math.max(3, Math.round(bubbleOuterR * 0.55));

      // Measure darkness for each digit row (0-9)
      const digitDarkness = [];

      for (let digit = 0; digit < 10; digit++) {
        const digitRowY = Math.round(gridStartY + ((digit + 0.5) / 10) * gridHeight);
        let innerDark = 0;
        let innerTotal = 0;
        let ringDark = 0;
        let ringTotal = 0;

        for (let dy = -bubbleOuterR; dy <= bubbleOuterR; dy++) {
          for (let dx = -bubbleOuterR; dx <= bubbleOuterR; dx++) {
            const dist2 = dx * dx + dy * dy;
            if (dist2 > bubbleOuterR * bubbleOuterR) continue;

            const x = colCenterX + dx;
            const y = digitRowY + dy;

            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            const pixelValue = data[y * width + x];
            const isDark = pixelValue < 145;

            if (dist2 <= bubbleInnerR * bubbleInnerR) {
              innerTotal++;
              if (isDark) innerDark++;
            } else {
              ringTotal++;
              if (isDark) ringDark++;
            }
          }
        }

        const innerRatio = innerTotal > 0 ? innerDark / innerTotal : 0;
        const ringRatio = ringTotal > 0 ? ringDark / ringTotal : 0;
        // Filled bubble should have dark center; empty bubble mainly dark ring only.
        const score = innerRatio - ringRatio * 0.35;
        digitDarkness.push({ digit, darkness: score });
      }

      // Find digit with highest darkness (filled bubble)
      const filledDigit = digitDarkness.reduce((max, curr) =>
        curr.darkness > max.darkness ? curr : max
      );

      const selectedDigit = filledDigit.darkness > 0.04 ? filledDigit.digit : 0;
      digits.push(selectedDigit);
      
      // DEBUG: Print darkness values for this column
      const darknessStr = digitDarkness.map(d => `${d.digit}:${(d.darkness*100).toFixed(1)}%`).join(' | ');
      console.log(`   [COL ${col}] Darkness: ${darknessStr} → Selected: ${selectedDigit} (max: ${filledDigit.digit} @${(filledDigit.darkness*100).toFixed(1)}%)`);
    }

    const result = digits.join('');
    if (result !== '00000') {
      console.log(`   ✓ SBD: "${result}"`);
    } else {
      console.log(`   ⚠ SBD: Không quét được rõ ràng`);
    }

    return result;
  } catch (error) {
    console.warn(`   ⚠ Lỗi detect SBD: ${error.message}`);
    return null;
  }
};

/**
 * Detect exam code from Mã Đề ROI (3 columns × 10 rows)
 */
const detectExamCodeEnhanced = async (roiData) => {
  try {
    const { data, info } = roiData;
    const { width, height, channels } = info;

    const digitColumns = 3;
    const colWidth = width / digitColumns;
    const topPadding = Math.round(height * 0.12);
    const gridStartY = topPadding;
    const gridEndY = height - Math.round(height * 0.04);
    const gridHeight = gridEndY - gridStartY;

    const digits = [];

    // Same process as SBD but for 3 columns
    for (let col = 0; col < digitColumns; col++) {
      const colStart = Math.round(col * colWidth + 2);
      const colEnd = Math.round((col + 1) * colWidth - 2);
      const colCenterX = Math.round((colStart + colEnd) / 2);
      const rowHeight = gridHeight / 10;
      const bubbleOuterR = Math.max(5, Math.round(Math.min(colWidth, rowHeight) * 0.20));
      const bubbleInnerR = Math.max(3, Math.round(bubbleOuterR * 0.55));

      const digitDarkness = [];

      for (let digit = 0; digit < 10; digit++) {
        const digitRowY = Math.round(gridStartY + ((digit + 0.5) / 10) * gridHeight);
        let innerDark = 0;
        let innerTotal = 0;
        let ringDark = 0;
        let ringTotal = 0;

        for (let dy = -bubbleOuterR; dy <= bubbleOuterR; dy++) {
          for (let dx = -bubbleOuterR; dx <= bubbleOuterR; dx++) {
            const dist2 = dx * dx + dy * dy;
            if (dist2 > bubbleOuterR * bubbleOuterR) continue;

            const x = colCenterX + dx;
            const y = digitRowY + dy;

            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            const pixelValue = data[y * width + x];
            const isDark = pixelValue < 145;

            if (dist2 <= bubbleInnerR * bubbleInnerR) {
              innerTotal++;
              if (isDark) innerDark++;
            } else {
              ringTotal++;
              if (isDark) ringDark++;
            }
          }
        }

        const innerRatio = innerTotal > 0 ? innerDark / innerTotal : 0;
        const ringRatio = ringTotal > 0 ? ringDark / ringTotal : 0;
        const score = innerRatio - ringRatio * 0.35;
        digitDarkness.push({ digit, darkness: score });
      }

      const filledDigit = digitDarkness.reduce((max, curr) =>
        curr.darkness > max.darkness ? curr : max
      );

      const selectedDigit = filledDigit.darkness > 0.04 ? filledDigit.digit : 0;
      digits.push(selectedDigit);
      
      // DEBUG: Print darkness values for this column
      const darknessStr = digitDarkness.map(d => `${d.digit}:${(d.darkness*100).toFixed(1)}%`).join(' | ');
      console.log(`   [MÃ ĐỀ COL ${col}] Darkness: ${darknessStr} → Selected: ${selectedDigit} (max: ${filledDigit.digit} @${(filledDigit.darkness*100).toFixed(1)}%)`);
    }

    const result = digits.join('');
    if (result !== '000') {
      console.log(`   ✓ Mã Đề: "${result}"`);
    } else {
      console.log(`   ⚠ Mã Đề: Không quét được rõ ràng`);
    }

    return result;
  } catch (error) {
    console.warn(`   ⚠ Lỗi detect Mã Đề: ${error.message}`);
    return null;
  }
};

/**
 * Detect answers from answer grid ROI (60 questions × 4 choices)
 */
const detectAnswersEnhanced = async (roiData) => {
  try {
    const { data, info } = roiData;
    const { width, height, channels } = info;

    const answers = [];
    const questionsPerColumn = 20;
    const columnsCount = 3;
    const choicesCount = 4; // A, B, C, D
    const totalQuestions = 60;

    const colWidth = width / columnsCount;
    const rowHeight = height / questionsPerColumn;
    const choiceWidth = colWidth / choicesCount;

    // Detection parameters
    const bubbleRadius = 8;

    for (let qIndex = 0; qIndex < totalQuestions; qIndex++) {
      const colIndex = Math.floor(qIndex / questionsPerColumn);
      const rowIndex = qIndex % questionsPerColumn;

      const colStart = Math.round(colIndex * colWidth);
      const rowStart = Math.round(rowIndex * rowHeight);

      // Calculate bubble centers for A, B, C, D
      const choices = ['A', 'B', 'C', 'D'];
      let filledChoice = null;
      let maxDarkness = 0;

      for (let choiceIdx = 0; choiceIdx < choicesCount; choiceIdx++) {
        const bubbleCenterX = Math.round(colStart + (choiceIdx + 0.5) * choiceWidth);
        const bubbleCenterY = Math.round(rowStart + rowHeight / 2);

        // Check if bubble is filled
        let darkPixels = 0;
        let totalPixels = 0;

        for (let dx = -bubbleRadius; dx <= bubbleRadius; dx++) {
          for (let dy = -bubbleRadius; dy <= bubbleRadius; dy++) {
            if (dx * dx + dy * dy > bubbleRadius * bubbleRadius) continue;

            const x = bubbleCenterX + dx;
            const y = bubbleCenterY + dy;

            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            const pixelValue = data[y * width + x];
            totalPixels++;
            if (pixelValue < 128) darkPixels++;
          }
        }

        const darkness = totalPixels > 0 ? darkPixels / totalPixels : 0;

        if (darkness > 0.35 && darkness > maxDarkness) {
          maxDarkness = darkness;
          filledChoice = choices[choiceIdx];
        }
      }

      answers.push(filledChoice);
    }

    const answeredCount = answers.filter(a => a).length;
    console.log(`   ✓ Quét được ${answeredCount}/${totalQuestions} câu trả lời`);

    return answers;
  } catch (error) {
    console.warn(`   ⚠ Lỗi detect Answers: ${error.message}`);
    return new Array(60).fill(null);
  }
};

/**
 * Helper: Generate placeholder when detection fails
 */
const generatePlaceholder = (length) => {
  return '0'.repeat(length);
};

export default {
  detectOMRMarkings,
};
