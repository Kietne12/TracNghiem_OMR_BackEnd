import fs from "fs";
import sharp from "sharp";
import { getOmrLayout, toLocalPoint } from "./omrLayout.js";

const ANSWER_CHOICES = ["A", "B", "C", "D"];

const toBoxFromCircle = (centerX, centerY, radius) => ({
  left: Math.round(centerX - radius),
  top: Math.round(centerY - radius),
  width: Math.round(radius * 2),
  height: Math.round(radius * 2),
});

const logRegionBox = (group, label, box, extra = "") => {
  const suffix = extra ? ` | ${extra}` : "";
  console.log(
    `   [${group}] ${label}: x=${box.left}, y=${box.top}, w=${box.width}, h=${box.height}${suffix}`
  );
};

const clampExtractBox = (box, width, height) => ({
  left: Math.max(0, Math.min(width - 1, Math.round(box.left))),
  top: Math.max(0, Math.min(height - 1, Math.round(box.top))),
  width: Math.max(1, Math.min(width - Math.round(box.left), Math.round(box.width))),
  height: Math.max(1, Math.min(height - Math.round(box.top), Math.round(box.height))),
});

const generatePlaceholder = (length) => "0".repeat(length);

const MAX_PROCESSING_SIDE = 1800;

const sampleBubble = (data, width, height, center, radius, threshold = 170) => {
  const outerRadius = Math.max(4, Math.round(radius));
  const innerRadius = Math.max(2, Math.round(outerRadius * 0.58));
  let innerDark = 0;
  let innerTotal = 0;
  let ringDark = 0;
  let ringTotal = 0;

  for (let dy = -outerRadius; dy <= outerRadius; dy += 1) {
    for (let dx = -outerRadius; dx <= outerRadius; dx += 1) {
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > outerRadius * outerRadius) continue;

      const x = Math.round(center.x + dx);
      const y = Math.round(center.y + dy);
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const value = data[y * width + x];
      const isDark = value < threshold;

      if (distanceSquared <= innerRadius * innerRadius) {
        innerTotal += 1;
        if (isDark) innerDark += 1;
      } else {
        ringTotal += 1;
        if (isDark) ringDark += 1;
      }
    }
  }

  const innerRatio = innerTotal > 0 ? innerDark / innerTotal : 0;
  const ringRatio = ringTotal > 0 ? ringDark / ringTotal : 0;
  const score = innerRatio - ringRatio * 0.35;

  return {
    innerRatio,
    ringRatio,
    score,
  };
};

const scoreBubbleGeometry = (data, width, height, center, radius, threshold = 170) => {
  const outerRadius = Math.max(4, Math.round(radius));
  const innerRadius = Math.max(2, Math.round(outerRadius * 0.55));
  const ringInnerRadius = Math.max(innerRadius + 1, Math.round(outerRadius * 0.7));
  let innerDark = 0;
  let innerTotal = 0;
  let ringDark = 0;
  let ringTotal = 0;

  for (let dy = -outerRadius; dy <= outerRadius; dy += 1) {
    for (let dx = -outerRadius; dx <= outerRadius; dx += 1) {
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > outerRadius * outerRadius) continue;

      const x = Math.round(center.x + dx);
      const y = Math.round(center.y + dy);
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const value = data[y * width + x];
      const isDark = value < threshold;

      if (distanceSquared <= innerRadius * innerRadius) {
        innerTotal += 1;
        if (isDark) innerDark += 1;
      } else if (distanceSquared >= ringInnerRadius * ringInnerRadius) {
        ringTotal += 1;
        if (isDark) ringDark += 1;
      }
    }
  }

  const innerRatio = innerTotal > 0 ? innerDark / innerTotal : 0;
  const ringRatio = ringTotal > 0 ? ringDark / ringTotal : 0;
  return ringRatio * 0.85 + innerRatio * 0.15;
};

const refineBubbleCenter = (data, width, height, center, radius, threshold = 170) => {
  const searchRadius = Math.max(3, Math.round(radius * 0.8));
  let bestCenter = { ...center };
  let bestScore = scoreBubbleGeometry(data, width, height, center, radius, threshold);

  for (let dy = -searchRadius; dy <= searchRadius; dy += 2) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += 2) {
      const candidate = {
        x: center.x + dx,
        y: center.y + dy,
      };
      const score = scoreBubbleGeometry(data, width, height, candidate, radius, threshold);
      if (score > bestScore) {
        bestScore = score;
        bestCenter = candidate;
      }
    }
  }

  return bestCenter;
};

const solveLinearSystem = (matrix, vector) => {
  const n = vector.length;
  const a = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < n; column += 1) {
    let pivotRow = column;
    for (let row = column + 1; row < n; row += 1) {
      if (Math.abs(a[row][column]) > Math.abs(a[pivotRow][column])) {
        pivotRow = row;
      }
    }

    if (Math.abs(a[pivotRow][column]) < 1e-9) {
      throw new Error("Khong giai duoc ma tran bien doi phoi canh");
    }

    [a[column], a[pivotRow]] = [a[pivotRow], a[column]];
    const pivot = a[column][column];
    for (let col = column; col <= n; col += 1) {
      a[column][col] /= pivot;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = a[row][column];
      for (let col = column; col <= n; col += 1) {
        a[row][col] -= factor * a[column][col];
      }
    }
  }

  return a.map((row) => row[n]);
};

const computeHomography = (sourcePoints, destinationPoints) => {
  const matrix = [];
  const vector = [];

  sourcePoints.forEach((source, index) => {
    const destination = destinationPoints[index];
    const { x, y } = source;
    const u = destination.x;
    const v = destination.y;

    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    vector.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    vector.push(v);
  });

  const h = solveLinearSystem(matrix, vector);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
};

const applyHomography = (homography, point) => {
  const denominator = homography[6] * point.x + homography[7] * point.y + homography[8];
  return {
    x: (homography[0] * point.x + homography[1] * point.y + homography[2]) / denominator,
    y: (homography[3] * point.x + homography[4] * point.y + homography[5]) / denominator,
  };
};

const detectAnchorPoints = async (imageBuffer, metadata) => {
  try {
    const targetWidth = 900;
    const { data, info } = await sharp(imageBuffer)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .grayscale()
      .threshold(110)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    const scaleX = metadata.width / width;
    const scaleY = metadata.height / height;
    const cornerRatio = 0.18;
    const cornerW = Math.max(60, Math.floor(width * cornerRatio));
    const cornerH = Math.max(60, Math.floor(height * cornerRatio));
    const minArea = 90;
    const maxArea = 900;
    const targetArea = 420;

    const corners = [
      { name: "topLeft", x: 0, y: 0, w: cornerW, h: cornerH },
      { name: "topRight", x: width - cornerW, y: 0, w: cornerW, h: cornerH },
      { name: "bottomLeft", x: 0, y: height - cornerH, w: cornerW, h: cornerH },
      { name: "bottomRight", x: width - cornerW, y: height - cornerH, w: cornerW, h: cornerH },
    ];

    const findInRegion = (region) => {
      const visited = new Uint8Array(region.w * region.h);
      const roiIndex = (x, y) => (y - region.y) * region.w + (x - region.x);
      const isBlack = (x, y) => data[y * width + x] < 20;
      let best = null;

      for (let y = region.y; y < region.y + region.h; y += 1) {
        for (let x = region.x; x < region.x + region.w; x += 1) {
          const idx = roiIndex(x, y);
          if (visited[idx]) continue;
          visited[idx] = 1;
          if (!isBlack(x, y)) continue;

          const queue = [[x, y]];
          let q = 0;
          let area = 0;
          let sumX = 0;
          let sumY = 0;
          let minX = x;
          let maxX = x;
          let minY = y;
          let maxY = y;

          while (q < queue.length) {
            const [cx, cy] = queue[q];
            q += 1;
            area += 1;
            sumX += cx;
            sumY += cy;
            minX = Math.min(minX, cx);
            maxX = Math.max(maxX, cx);
            minY = Math.min(minY, cy);
            maxY = Math.max(maxY, cy);

            const neighbors = [
              [cx - 1, cy],
              [cx + 1, cy],
              [cx, cy - 1],
              [cx, cy + 1],
            ];

            for (const [nx, ny] of neighbors) {
              if (
                nx < region.x ||
                nx >= region.x + region.w ||
                ny < region.y ||
                ny >= region.y + region.h
              ) {
                continue;
              }

              const neighborIndex = roiIndex(nx, ny);
              if (visited[neighborIndex]) continue;
              visited[neighborIndex] = 1;
              if (isBlack(nx, ny)) queue.push([nx, ny]);
            }
          }

          if (area < minArea || area > maxArea) continue;
          const boxWidth = maxX - minX + 1;
          const boxHeight = maxY - minY + 1;
          const aspect = boxWidth / Math.max(1, boxHeight);
          if (aspect < 0.5 || aspect > 1.8) continue;
          const fillRatio = area / Math.max(1, boxWidth * boxHeight);
          if (fillRatio < 0.45) continue;

          const score =
            Math.abs(area - targetArea) +
            Math.abs(1 - aspect) * 80 +
            Math.abs(0.9 - fillRatio) * 80;
          if (!best || score < best.score) {
            best = {
              score,
              x: sumX / area,
              y: sumY / area,
              area,
            };
          }
        }
      }

      return best;
    };

    const detected = corners
      .map((corner) => {
        const anchor = findInRegion(corner);
        if (!anchor) return null;
        return {
          region: corner.name,
          x: Math.round(anchor.x * scaleX),
          y: Math.round(anchor.y * scaleY),
          size: anchor.area,
        };
      })
      .filter(Boolean);

    if (detected.length < 4) {
      console.log(`   i Tim duoc ${detected.length}/4 diem neo o 4 goc`);
      return null;
    }

    const ordered = [
      detected.find((item) => item.region === "topLeft"),
      detected.find((item) => item.region === "topRight"),
      detected.find((item) => item.region === "bottomLeft"),
      detected.find((item) => item.region === "bottomRight"),
    ];

    if (ordered.some((item) => !item)) {
      console.log("   i Thieu mot hoac nhieu diem neo ngoai");
      return null;
    }

    console.log("   xac nhan du 4 diem neo ngoai");
    return ordered;
  } catch (error) {
    console.warn(`   ! Loi detect anchor points: ${error.message}`);
    return null;
  }
};

const applyPerspectiveTransform = async (imageBuffer, anchorPoints) => {
  const topLeft = anchorPoints[0];
  const topRight = anchorPoints[1];
  const angle =
    (Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x) * 180) / Math.PI;

  console.log(`   goc xoay uoc tinh: ${angle.toFixed(2)} do`);

  // Skip minor/uncertain corrections; local bubble-center refinement is more stable here.
  if (Math.abs(angle) <= 4 || Math.abs(angle) >= 12) return imageBuffer;

  return sharp(imageBuffer)
    .rotate(-angle, { background: { r: 255, g: 255, b: 255 } })
    .toBuffer();
};

const normalizePageFromAnchors = async (imageBuffer, metadata, anchorPoints) => {
  const templateWidth = 595.28;
  const templateHeight = 841.89;
  const scale = 3;
  const outputWidth = Math.round(templateWidth * scale);
  const outputHeight = Math.round(templateHeight * scale);
  const destinationAnchors = [
    { x: 24 * scale, y: 24 * scale },
    { x: (templateWidth - 24) * scale, y: 24 * scale },
    { x: 24 * scale, y: (templateHeight - 24) * scale },
    { x: (templateWidth - 24) * scale, y: (templateHeight - 24) * scale },
  ];

  const sourceAnchors = anchorPoints.map((point) => ({ x: point.x, y: point.y }));
  const destinationToSource = computeHomography(destinationAnchors, sourceAnchors);
  const { data, info } = await sharp(imageBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = Buffer.alloc(outputWidth * outputHeight * 3, 255);

  for (let y = 0; y < outputHeight; y += 1) {
    for (let x = 0; x < outputWidth; x += 1) {
      const source = applyHomography(destinationToSource, { x, y });
      const sx = Math.round(source.x);
      const sy = Math.round(source.y);
      if (sx < 0 || sx >= info.width || sy < 0 || sy >= info.height) continue;

      const sourceIndex = (sy * info.width + sx) * info.channels;
      const outputIndex = (y * outputWidth + x) * 3;
      output[outputIndex] = data[sourceIndex];
      output[outputIndex + 1] = data[sourceIndex + 1] ?? data[sourceIndex];
      output[outputIndex + 2] = data[sourceIndex + 2] ?? data[sourceIndex];
    }
  }

  console.log(
    `   da trai phang trang theo 4 marker ngoai: ${outputWidth}x${outputHeight}`
  );

  return sharp(output, {
    raw: {
      width: outputWidth,
      height: outputHeight,
      channels: 3,
    },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
};

const buildRegionData = async (imageBuffer, imageWidth, imageHeight, box, points) => {
  const extractBox = clampExtractBox(box, imageWidth, imageHeight);
  const { data, info } = await sharp(imageBuffer)
    .extract(extractBox)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data,
    info,
    box: extractBox,
    points: points.map((point) => ({
      ...point,
      localCenter: point.choice
        ? refineBubbleCenter(
            data,
            info.width,
            info.height,
            toLocalPoint(extractBox, point.center),
            point.radius,
            175
          )
        : toLocalPoint(extractBox, point.center),
    })),
  };
};

const extractRegionROIs = async (imageBuffer, metadata) => {
  const layout = getOmrLayout({
    pageWidth: metadata.width,
    pageHeight: metadata.height,
  });

  const sbdPoints = layout.sbd.bubbles.flatMap((column, columnIndex) =>
    column.map((bubble, digit) => ({
      columnIndex,
      digit,
      center: { x: bubble.x, y: bubble.y },
      radius: bubble.radius,
    }))
  );

  const maDePoints = layout.maDe.bubbles.flatMap((column, columnIndex) =>
    column.map((bubble, digit) => ({
      columnIndex,
      digit,
      center: { x: bubble.x, y: bubble.y },
      radius: bubble.radius,
    }))
  );

  const answerPoints = layout.answers.questions.flatMap((question) =>
    question.bubbles.map((bubble) => ({
      questionNumber: question.number,
      choice: bubble.choice,
      center: { x: bubble.x, y: bubble.y },
      radius: bubble.radius,
    }))
  );

  logRegionBox("ROI", "SBD", layout.sbd.box);
  logRegionBox("ROI", "MADE", layout.maDe.box);
  logRegionBox("ROI", "ANS", layout.answers.outerBox);

  return {
    sbd: await buildRegionData(imageBuffer, metadata.width, metadata.height, layout.sbd.box, sbdPoints),
    maDe: await buildRegionData(
      imageBuffer,
      metadata.width,
      metadata.height,
      layout.maDe.box,
      maDePoints
    ),
    answers: await buildRegionData(
      imageBuffer,
      metadata.width,
      metadata.height,
      layout.answers.outerBox,
      answerPoints
    ),
  };
};

const detectDigits = (regionData, expectedColumns, label) => {
  const { data, info, points } = regionData;
  const digits = [];

  for (let columnIndex = 0; columnIndex < expectedColumns; columnIndex += 1) {
    const candidates = points
      .filter((item) => item.columnIndex === columnIndex)
      .map((item) => ({
        digit: item.digit,
        ...sampleBubble(data, info.width, info.height, item.localCenter, item.radius, 125),
      }))
      .sort((a, b) => b.score - a.score);

    const best = candidates[0];
    const second = candidates[1] || { score: 0 };
    const selected = best && best.score > 0.085 && best.score - second.score > 0.015
      ? best.digit
      : 0;

    const debug = candidates
      .map((item) => `${item.digit}:${item.score.toFixed(3)}`)
      .join(" | ");
    console.log(`   [${label} C${columnIndex}] ${debug} -> ${selected}`);
    digits.push(selected);
  }

  return digits.join("");
};

const detectAnswersEnhanced = (regionData) => {
  const { data, info, points } = regionData;
  const answers = [];

  for (let questionNumber = 1; questionNumber <= 60; questionNumber += 1) {
    const candidates = points
      .filter((item) => item.questionNumber === questionNumber)
      .map((item) => ({
        choice: item.choice,
        ...sampleBubble(data, info.width, info.height, item.localCenter, item.radius, 125),
      }))
      .sort((a, b) => b.score - a.score);

    const best = candidates[0];
    const second = candidates[1] || { score: 0 };
    const selected =
      best && best.score > 0.5 && best.score - second.score > 0.12 ? best.choice : null;
    answers.push(selected);
  }

  const answeredCount = answers.filter(Boolean).length;
  console.log(`   quet duoc ${answeredCount}/60 dap an da to`);
  return answers;
};

export const detectOMRMarkings = async (imagePath) => {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Anh OMR khong ton tai: ${imagePath}`);
  }

  try {
    console.log("\n========================================");
    console.log("   ENHANCED OMR DETECTION PIPELINE");
    console.log("========================================");

    const fileBuffer = fs.readFileSync(imagePath);
    let normalizedBuffer = await sharp(fileBuffer)
      .rotate()
      .resize({
        width: MAX_PROCESSING_SIDE,
        height: MAX_PROCESSING_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90 })
      .toBuffer();
    let metadata = await sharp(normalizedBuffer).metadata();

    if ((metadata.width || 0) > (metadata.height || 0)) {
      normalizedBuffer = await sharp(normalizedBuffer).rotate(90).toBuffer();
      metadata = await sharp(normalizedBuffer).metadata();
      console.log("   anh dau vao dang ngang, da xoay ve dang doc");
    }

    if (metadata.format !== "jpeg" && metadata.format !== "png") {
      normalizedBuffer = await sharp(normalizedBuffer).png().toBuffer();
      metadata = await sharp(normalizedBuffer).metadata();
    }

    console.log(`   kich thuoc anh sau chuan hoa: ${metadata.width}x${metadata.height}`);

    console.log("\n   STEP 1: tim anchor ngoai...");
    const anchorPoints = await detectAnchorPoints(normalizedBuffer, metadata);

    let correctedBuffer = normalizedBuffer;
    let perspectiveApplied = false;

    if (anchorPoints) {
      correctedBuffer = await normalizePageFromAnchors(normalizedBuffer, metadata, anchorPoints);
      perspectiveApplied = correctedBuffer !== normalizedBuffer;
      metadata = await sharp(correctedBuffer).metadata();
    } else {
      console.log("   khong tim thay du anchor ngoai, tiep tuc voi anh da chuan hoa");
    }

    console.log("\n   STEP 2: cat dung 3 vung can quet...");
    const roiData = await extractRegionROIs(correctedBuffer, metadata);

    console.log("\n   STEP 3: quet MSSV...");
    const mssv = detectDigits(roiData.sbd, 5, "SBD");
    console.log(`   MSSV => ${mssv}`);

    console.log("\n   STEP 4: quet ma de...");
    const maDe = detectDigits(roiData.maDe, 3, "MADE");
    console.log(`   MA DE => ${maDe}`);

    console.log("\n   STEP 5: quet dap an...");
    const answers = detectAnswersEnhanced(roiData.answers);

    console.log("\n========================================");
    console.log("   DETECTION COMPLETE");
    console.log("========================================\n");

    return {
      mssv: mssv || generatePlaceholder(5),
      maDe: maDe || generatePlaceholder(3),
      answers: answers || new Array(60).fill(null),
      perspectiveApplied,
      anchorsDetected: Boolean(anchorPoints),
    };
  } catch (error) {
    console.error(`OMR detection error: ${error.message}`);
    throw error;
  }
};

export default {
  detectOMRMarkings,
};
