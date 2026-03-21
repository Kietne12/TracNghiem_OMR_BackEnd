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
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    console.log(`   📸 Kích thước ảnh: ${metadata.width}x${metadata.height}`);

    // Normalize image format
    let normalizedBuffer = imageBuffer;
    if (metadata.format !== 'jpeg' && metadata.format !== 'png') {
      normalizedBuffer = await sharp(imageBuffer).png().toBuffer();
    }

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
    // Create grayscale version for analysis
    const grayscaleBuffer = await sharp(imageBuffer)
      .grayscale()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = grayscaleBuffer;
    const { width, height, channels } = info;

    // Detect black regions (pixel value < 100)
    const blackPixels = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * channels;
        const pixelValue = data[pixelIndex];
        
        if (pixelValue < 100) {
          blackPixels.push({ x, y, intensity: pixelValue });
        }
      }
    }

    if (blackPixels.length === 0) return null;

    // Cluster black pixels to find anchor points (6x6px squares)
    const clusters = clusterPixels(blackPixels, 15); // 15px radius for clustering
    
    // Filter clusters by size (anchor points should be ~6x6px = ~36px²)
    const validClusters = clusters.filter(cluster => {
      const area = cluster.length;
      return area > 20 && area < 100; // Reasonable anchor point size
    });

    if (validClusters.length < 4) {
      console.log(`   ℹ Tìm được ${validClusters.length} cluster đen (cần 4 cho anchor points)`);
      return null;
    }

    // Calculate cluster centers
    const anchorPoints = validClusters.map(cluster => ({
      x: Math.round(cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length),
      y: Math.round(cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length),
      size: cluster.length,
    }));

    // Sort by position: identify corners
    // Top-left, top-right, bottom-left, bottom-right
    anchorPoints.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 50) return a.x - b.x; // Same Y → sort by X
      return a.y - b.y; // Different Y → sort by Y
    });

    console.log(`   ✓ Tìm thấy ${anchorPoints.length} điểm neo tiềm năng:`);
    anchorPoints.forEach((p, i) => {
      console.log(`      [${i}] (${p.x}, ${p.y}) - size: ${p.size}px²`);
    });

    return anchorPoints;
  } catch (error) {
    console.warn(`   ⚠ Lỗi detect anchor points: ${error.message}`);
    return null;
  }
};

/**
 * Cluster pixels using simple spatial clustering
 */
const clusterPixels = (pixels, radius) => {
  if (pixels.length === 0) return [];

  const clusters = [];
  const visited = new Set();

  for (const pixel of pixels) {
    const key = `${pixel.x},${pixel.y}`;
    if (visited.has(key)) continue;

    const cluster = [];
    const queue = [pixel];

    while (queue.length > 0) {
      const current = queue.shift();
      const currentKey = `${current.x},${current.y}`;

      if (visited.has(currentKey)) continue;
      visited.add(currentKey);
      cluster.push(current);

      // Find neighbors
      for (const neighbor of pixels) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (visited.has(neighborKey)) continue;

        const distance = Math.sqrt(
          Math.pow(current.x - neighbor.x, 2) +
          Math.pow(current.y - neighbor.y, 2)
        );

        if (distance <= radius) {
          queue.push(neighbor);
        }
      }
    }

    if (cluster.length > 0) {
      clusters.push(cluster);
    }
  }

  return clusters.sort((a, b) => b.length - a.length);
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
    const infoBoxHeight = Math.round(250 * layoutScale);
    const infoTop = Math.round(74 * layoutScale);

    // Extract SBD region
    console.log(`   → Trích xuất vùng SBD...`);
    const sbdRegion = await sharp(imageBuffer)
      .extract({
        left: Math.round(rightInfoX),
        top: Math.round(infoTop),
        width: Math.round(sbdBoxWidth),
        height: infoBoxHeight,
      })
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
      .toBuffer({ resolveWithObject: true });

    // Extract Answers grid region
    console.log(`   → Trích xuất vùng Đáp án...`);
    const answersGridX = Math.round(marginLeft);
    const answersGridY = Math.round(infoTop + infoBoxHeight + Math.round(30 * layoutScale));
    const answersGridWidth = Math.round(pageWidth - 2 * marginLeft);
    const answersGridHeight = Math.round(pageHeight - answersGridY - marginTop);

    const answersRegion = await sharp(imageBuffer)
      .extract({
        left: answersGridX,
        top: answersGridY,
        width: answersGridWidth,
        height: answersGridHeight,
      })
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

      // Measure darkness for each digit row (0-9)
      const digitDarkness = [];

      for (let digit = 0; digit < 10; digit++) {
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

      // Find digit with highest darkness (filled bubble)
      const filledDigit = digitDarkness.reduce((max, curr) =>
        curr.darkness > max.darkness ? curr : max
      );

      digits.push(filledDigit.darkness > 0.15 ? filledDigit.digit : 0);
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

      const digitDarkness = [];

      for (let digit = 0; digit < 10; digit++) {
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

      const filledDigit = digitDarkness.reduce((max, curr) =>
        curr.darkness > max.darkness ? curr : max
      );

      digits.push(filledDigit.darkness > 0.15 ? filledDigit.digit : 0);
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
