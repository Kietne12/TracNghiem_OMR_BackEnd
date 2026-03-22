const DEFAULT_CONFIG = {
  expectedQuestions: 60,
  questionsPerColumn: 20,
  choicesPerQuestion: 4,
  columnsCount: 3,
  blurKernel: 5,
  adaptiveBlockSize: 31,
  adaptiveC: 9,
  useAnchorGuidedFlow: true,
  usePerspectiveTransform: true,
  cannyThreshold1: 70,
  cannyThreshold2: 180,
  minContourAreaRatio: 0.00001,
  maxContourAreaRatio: 0.003,
  minAspectRatio: 0.68,
  maxAspectRatio: 1.32,
  minCircularity: 0.16,
  minDetectedBubbleRatio: 0.3,
  blankDensityThreshold: 0.05,
  invalidSimilarityRatio: 0.9,
  invalidMinDensity: 0.2,
  numericColumnMergeXThreshold: 20,
  morphologicalKernel: 3,
  debug: true,
};

const CHOICES = ["A", "B", "C", "D"];

const assertCvReady = () => {
  if (typeof cv === "undefined") {
    throw new Error("OpenCV.js chưa sẵn sàng. Hãy load opencv.js trước khi gọi OMRProcessor.");
  }
};

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const orderPoints = (points) => {
  const sum = points.map((p) => p.x + p.y);
  const diff = points.map((p) => p.x - p.y);

  const tl = points[sum.indexOf(Math.min(...sum))];
  const br = points[sum.indexOf(Math.max(...sum))];
  // Với diff = x - y: TR có diff lớn nhất, BL có diff nhỏ nhất.
  const tr = points[diff.indexOf(Math.max(...diff))];
  const bl = points[diff.indexOf(Math.min(...diff))];

  return [tl, tr, br, bl];
};

const distance = (p1, p2) => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const kmeans1D = (values, k, maxIterations = 100) => {
  if (values.length < k) {
    throw new Error(`Không đủ dữ liệu để phân cụm ${k} cột.`);
  }

  const sorted = [...values].sort((a, b) => a - b);
  let centers = Array.from({ length: k }, (_, i) => {
    const idx = Math.floor((i + 0.5) * sorted.length / k);
    return sorted[clamp(idx, 0, sorted.length - 1)];
  });

  for (let iter = 0; iter < maxIterations; iter += 1) {
    const groups = Array.from({ length: k }, () => []);

    values.forEach((value) => {
      let minDistance = Number.POSITIVE_INFINITY;
      let bestIdx = 0;

      centers.forEach((center, idx) => {
        const d = Math.abs(value - center);
        if (d < minDistance) {
          minDistance = d;
          bestIdx = idx;
        }
      });

      groups[bestIdx].push(value);
    });

    const newCenters = centers.map((oldCenter, idx) => {
      if (!groups[idx].length) return oldCenter;
      const sum = groups[idx].reduce((acc, v) => acc + v, 0);
      return sum / groups[idx].length;
    });

    const unchanged = newCenters.every((center, idx) => Math.abs(center - centers[idx]) < 0.5);
    centers = newCenters;
    if (unchanged) break;
  }

  return centers;
};

const toCsv = (resultMap) => {
  const lines = ["question,answer"];
  Object.entries(resultMap).forEach(([question, answer]) => {
    lines.push(`${question},${answer}`);
  });
  return lines.join("\n");
};

const toFixedDigits = (value, length) => {
  const digits = String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, length);
  return digits.padEnd(length, "0");
};

const fileToImageElement = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không thể đọc file ảnh."));
    img.src = URL.createObjectURL(file);
  });

const createCanvasFromSource = async (source) => {
  if (source instanceof HTMLCanvasElement) return source;

  let image = source;
  if (source instanceof File) {
    image = await fileToImageElement(source);
  }

  if (!(image instanceof HTMLImageElement) && !(image instanceof ImageBitmap)) {
    throw new Error("Nguồn ảnh không hợp lệ. Hãy truyền File, HTMLImageElement hoặc Canvas.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, image.width, image.height);
  return canvas;
};

const normalizeAnchorInput = (points, regionName) => {
  if (!Array.isArray(points) || points.length !== 4) {
    throw new Error(`Anchor của vùng ${regionName} phải gồm đúng 4 điểm.`);
  }

  const normalized = points.map((p) => {
    if (Array.isArray(p) && p.length >= 2) {
      return { x: Number(p[0]), y: Number(p[1]) };
    }
    return { x: Number(p?.x), y: Number(p?.y) };
  });

  const invalid = normalized.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y));
  if (invalid) {
    throw new Error(`Anchor của vùng ${regionName} chứa tọa độ không hợp lệ.`);
  }

  return orderPoints(normalized);
};

const inferWarpSize = (orderedPoints, minWidth = 120, minHeight = 120) => {
  const [tl, tr, br, bl] = orderedPoints;

  const width = Math.max(
    minWidth,
    Math.round(Math.max(distance(br, bl), distance(tr, tl)))
  );

  const height = Math.max(
    minHeight,
    Math.round(Math.max(distance(tr, br), distance(tl, bl)))
  );

  return { width, height };
};

const makeRect = (x, y, width, height, maxWidth, maxHeight) => {
  const left = clamp(Math.round(x), 0, Math.max(0, maxWidth - 1));
  const top = clamp(Math.round(y), 0, Math.max(0, maxHeight - 1));
  const right = clamp(Math.round(x + width), left + 1, maxWidth);
  const bottom = clamp(Math.round(y + height), top + 1, maxHeight);
  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
};

const rectFromRatio = (width, height, ratioRect) =>
  makeRect(
    ratioRect.x * width,
    ratioRect.y * height,
    ratioRect.w * width,
    ratioRect.h * height,
    width,
    height
  );

const regionCornerWindows = (regionRect, imageWidth, imageHeight) => {
  const padX = Math.max(8, Math.round(regionRect.width * 0.03));
  const padY = Math.max(8, Math.round(regionRect.height * 0.03));
  const winW = Math.max(18, Math.round(regionRect.width * 0.22));
  const winH = Math.max(18, Math.round(regionRect.height * 0.22));

  return {
    topLeft: makeRect(regionRect.x + padX, regionRect.y + padY, winW, winH, imageWidth, imageHeight),
    topRight: makeRect(
      regionRect.x + regionRect.width - padX - winW,
      regionRect.y + padY,
      winW,
      winH,
      imageWidth,
      imageHeight
    ),
    bottomLeft: makeRect(
      regionRect.x + padX,
      regionRect.y + regionRect.height - padY - winH,
      winW,
      winH,
      imageWidth,
      imageHeight
    ),
    bottomRight: makeRect(
      regionRect.x + regionRect.width - padX - winW,
      regionRect.y + regionRect.height - padY - winH,
      winW,
      winH,
      imageWidth,
      imageHeight
    ),
  };
};

export class OMRProcessor {
  constructor(userConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...userConfig };
  }

  static async waitForOpenCv(timeoutMs = 15000) {
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const check = () => {
        if (typeof cv !== "undefined" && cv.getBuildInformation) {
          resolve();
          return;
        }

        if (Date.now() - start > timeoutMs) {
          reject(new Error("OpenCV.js load timeout."));
          return;
        }

        window.setTimeout(check, 100);
      };

      check();
    });
  }

  async process(source) {
    assertCvReady();

    const canvas = await createCanvasFromSource(source);
    const src = cv.imread(canvas);

    if (this.config.useAnchorGuidedFlow) {
      try {
        return this.processByAutoAnchorsFromMat(src);
      } finally {
        src.delete();
      }
    }

    let workingColor = null;
    let warpedGray = null;
    let blurred = null;
    let adaptive = null;
    let cleaned = null;
    let debugMat = null;

    try {
      if (this.config.usePerspectiveTransform) {
        const documentContour = this.detectDocumentContour(src);
        workingColor = this.warpToTopDown(src, documentContour);
      } else {
        // Process directly on original image without crop/rotate/warp.
        workingColor = src.clone();
        if (this.config.debug) {
          console.log("[OMR] usePerspectiveTransform=false -> xử lý trực tiếp trên ảnh gốc");
        }
      }

      warpedGray = new cv.Mat();
      cv.cvtColor(workingColor, warpedGray, cv.COLOR_RGBA2GRAY);

      blurred = new cv.Mat();
      cv.GaussianBlur(
        warpedGray,
        blurred,
        new cv.Size(this.config.blurKernel, this.config.blurKernel),
        0
      );

      adaptive = new cv.Mat();
      cv.adaptiveThreshold(
        blurred,
        adaptive,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        this.config.adaptiveBlockSize,
        this.config.adaptiveC
      );

      cleaned = this.applyMorphology(adaptive);
      const bubbles = this.detectBubblesWithRetry(cleaned, workingColor.cols * workingColor.rows);
      const structured = this.sortAndGroupBubbles(bubbles);

      const grading = this.detectAnswers(cleaned, structured);

      debugMat = this.drawDebugOverlay(workingColor, structured, grading);

      return {
        answers: grading.answersMap,
        metadata: {
          totalQuestions: Object.keys(grading.answersMap).length,
          blankCount: grading.blankCount,
          invalidCount: grading.invalidCount,
          detectedBubbleCount: bubbles.length,
        },
        debug: {
          logs: grading.logs,
          overlayCanvas: this.matToCanvas(debugMat),
          csv: toCsv(grading.answersMap),
        },
      };
    } finally {
      src.delete();
      if (workingColor) workingColor.delete();
      if (warpedGray) warpedGray.delete();
      if (blurred) blurred.delete();
      if (adaptive) adaptive.delete();
      if (cleaned) cleaned.delete();
      if (debugMat) debugMat.delete();
    }
  }

  processByAutoAnchorsFromMat(src) {
    let pageWarped = null;
    let pageBinary = null;

    let sbdColor = null;
    let maDeColor = null;
    let answersColor = null;

    let sbdBinary = null;
    let maDeBinary = null;
    let answersBinary = null;

    let pageOverlay = null;
    let sbdOverlay = null;
    let maDeOverlay = null;
    let answersOverlay = null;

    try {
      // *** BƯỚC 1: Tìm 4 điểm neo góc trang (Outer Anchors) ***
      // Sử dụng 4 chấm đen ở 4 góc tờ giấy để xác định ranh giới trang
      const outerAnchors = this.detectOuterAnchors(src);
      if (this.config.debug) {
        console.log(
          `[STEP 1] Outer Anchors: TL(${Math.round(outerAnchors[0].x)},${Math.round(outerAnchors[0].y)}) ` +
          `TR(${Math.round(outerAnchors[1].x)},${Math.round(outerAnchors[1].y)}) ` +
          `BR(${Math.round(outerAnchors[2].x)},${Math.round(outerAnchors[2].y)}) ` +
          `BL(${Math.round(outerAnchors[3].x)},${Math.round(outerAnchors[3].y)})`
        );
      }

      // Warp toàn bộ trang về kích thước chuẩn 1200x1700
      const standardPageSize = { width: 1200, height: 1700 };
      pageWarped = this.warpRegionByAnchors(src, outerAnchors, standardPageSize);
      pageBinary = this.preprocessToBinary(pageWarped);

      // *** DEBUG: Xuất warped page để kiểm tra 4 góc ***
      if (this.config.debug) {
        this.exportWarpedPageForDebug(pageWarped, "warped_page.png");
        console.log(`[WARP DEBUG] Warped page exported: ${pageWarped.cols}x${pageWarped.rows}`);
        console.log(`[WARP CHECK] 4 corners should be at edges: TL(0,0), TR(${pageWarped.cols-1},0), BR(${pageWarped.cols-1},${pageWarped.rows-1}), BL(0,${pageWarped.rows-1})`);
      }

      // *** BƯỚC 2: Xác định 3 vùng nội dung (Region Anchors) ***
      // Dựa trên tỉ lệ phần trăm tọa độ của trang đã nắn thẳng, xác định vùng SBD, Mã đề, Câu hỏi
      const regionAnchors = this.detectRegionAnchors(pageBinary, pageWarped.cols, pageWarped.rows);
      if (this.config.debug) {
        console.log(
          `[STEP 2] Region Anchors detected: ` +
          `SBD=${regionAnchors.sbd.length} points, ` +
          `MaDe=${regionAnchors.maDe.length} points, ` +
          `Answers=${regionAnchors.answers.length} points`
        );
      }

      sbdColor = this.warpRegionByAnchors(pageWarped, regionAnchors.sbd, { width: 300, height: 560 });
      maDeColor = this.warpRegionByAnchors(pageWarped, regionAnchors.maDe, { width: 220, height: 560 });
      answersColor = this.warpRegionByAnchors(pageWarped, regionAnchors.answers, { width: 1500, height: 1000 });

      sbdBinary = this.preprocessSbdForContours(sbdColor);
      maDeBinary = this.preprocessToBinary(maDeColor);
      answersBinary = this.preprocessToBinary(answersColor);

      // *** BƯỚC 3: Quét theo vùng (Region-based Scanning) ***
      // Chỉ thực hiện findContours bên trong mỗi vùng đã crop

      // Vùng SBD: Chia thành 5 cột x 10 hàng
      if (this.config.debug) {
        console.log(`[STEP 3] SBD: findContours trong vùng crop ${sbdColor.cols}x${sbdColor.rows}`);
      }
      const sbdResult = this.detectNumericGrid(sbdBinary, {
        digitColumns: 5,
        digitRows: 10,
        label: "SBD",
      });

      // Vùng Mã đề: Chia thành 3 cột x 10 hàng
      if (this.config.debug) {
        console.log(`[STEP 3] MãĐề: findContours trong vùng crop ${maDeColor.cols}x${maDeColor.rows}`);
      }
      const maDeResult = this.detectNumericGrid(maDeBinary, {
        digitColumns: 3,
        digitRows: 10,
        label: "MãĐề",
      });

      // Vùng trả lời: Chia thành 4 cột x 30 câu
      if (this.config.debug) {
        console.log(
          `[STEP 3] Answers: findContours trong vùng crop ${answersColor.cols}x${answersColor.rows} ` +
          `(dùng density check để loại bỏ text/khung)`
        );
      }
      const answerBubbles = this.detectBubblesWithRetry(
        answersBinary,
        answersColor.cols * answersColor.rows,
        {
          preDilateIterations: 0,
          extraAreaRelax: 1.15,
          minAreaRatioScale: 0.85,
          minCircularity: 0.22,
          targetCount: this.config.expectedQuestions * this.config.choicesPerQuestion,
          minDensity: 0.075,
        }
      );

      // Ghép bubble thành 4 cột, 30 câu mỗi cột
      const answerStructured = this.sortAndGroupBubblesWithDynamicRows(answerBubbles);
      if (this.config.debug) {
        console.log(
          `[STEP 3] Answers: Phát hiện ${answerBubbles.length} bubble, ` +
          `ghép thành ${answerStructured.length} câu hỏi (kỳ vọng: 120)`
        );

        // *** THỐNG KÊ Y-OFFSET ***
        const yOffsets = answerStructured
          .filter((q) => q.yOffset !== undefined)
          .map((q) => q.yOffset);
        if (yOffsets.length > 0) {
          const avgOffset = yOffsets.reduce((a, b) => a + b, 0) / yOffsets.length;
          const maxOffset = Math.max(...yOffsets.map(Math.abs));
          console.log(
            `[STEP 3] Y-offset stats: avg=${Math.round(avgOffset)}px, max=${Math.round(maxOffset)}px, ` +
            `detected=${answerStructured.filter((q) => q.yOffset !== undefined).length} questions with yOffset`
          );
        }
      }
      const answerResult = this.detectAnswers(answersBinary, answerStructured, {
        detectedBubbleCount: answerBubbles.length,
      });

      const outerAnchorsOnPage = [
        { x: 0, y: 0 },
        { x: pageWarped.cols - 1, y: 0 },
        { x: pageWarped.cols - 1, y: pageWarped.rows - 1 },
        { x: 0, y: pageWarped.rows - 1 },
      ];

      pageOverlay = this.drawAnchorOverlay(pageWarped, outerAnchorsOnPage, regionAnchors);
      sbdOverlay = this.drawNumericDebugOverlay(sbdColor, sbdResult.items, sbdResult.value, "SBD");
      maDeOverlay = this.drawNumericDebugOverlay(maDeColor, maDeResult.items, maDeResult.value, "Mã đề");
      answersOverlay = this.drawDebugOverlay(answersColor, answerStructured, answerResult);

      const mssv = toFixedDigits(sbdResult.value, 5);
      const maDe = toFixedDigits(maDeResult.value, 3);

      return {
        mssv,
        maDe,
        answers: answerResult.answersMap,
        metadata: {
          totalQuestions: Object.keys(answerResult.answersMap).length,
          blankCount: answerResult.blankCount,
          invalidCount: answerResult.invalidCount,
          detectedBubbleCount: answerBubbles.length,
          anchorsDetected: {
            outer: true,
            sbd: true,
            maDe: true,
            answers: true,
          },
        },
        debug: {
          overlayCanvas: this.matToCanvas(pageOverlay),
          sbdOverlayCanvas: this.matToCanvas(sbdOverlay),
          maDeOverlayCanvas: this.matToCanvas(maDeOverlay),
          answersOverlayCanvas: this.matToCanvas(answersOverlay),
          sbdLogs: sbdResult.logs,
          maDeLogs: maDeResult.logs,
          answerLogs: answerResult.logs,
          csv: toCsv(answerResult.answersMap),
        },
      };
    } finally {
      if (pageWarped) pageWarped.delete();
      if (pageBinary) pageBinary.delete();
      if (sbdColor) sbdColor.delete();
      if (maDeColor) maDeColor.delete();
      if (answersColor) answersColor.delete();
      if (sbdBinary) sbdBinary.delete();
      if (maDeBinary) maDeBinary.delete();
      if (answersBinary) answersBinary.delete();
      if (pageOverlay) pageOverlay.delete();
      if (sbdOverlay) sbdOverlay.delete();
      if (maDeOverlay) maDeOverlay.delete();
      if (answersOverlay) answersOverlay.delete();
    }
  }

  detectOuterAnchors(src) {
    const gray = new cv.Mat();

    try {
      // Chuyển sang xám
      if (src.channels() === 4) {
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      } else if (src.channels() === 3) {
        cv.cvtColor(src, gray, cv.COLOR_BGR2GRAY);
      } else {
        src.copyTo(gray);
      }

      const w = src.cols;
      const h = src.rows;
      const cornerRatio = 0.3; // Mở rộng vùng tìm kiếm để bắt được chấm sát mép

      const cornerWindows = {
        topLeft: makeRect(0, 0, w * cornerRatio, h * cornerRatio, w, h),
        topRight: makeRect(w * (1 - cornerRatio), 0, w * cornerRatio, h * cornerRatio, w, h),
        bottomLeft: makeRect(0, h * (1 - cornerRatio), w * cornerRatio, h * cornerRatio, w, h),
        bottomRight: makeRect(w * (1 - cornerRatio), h * (1 - cornerRatio), w * cornerRatio, h * cornerRatio, w, h),
      };

      const fallbackCorners = {
        topLeft: { x: 0, y: 0 },
        topRight: { x: w - 1, y: 0 },
        bottomRight: { x: w - 1, y: h - 1 },
        bottomLeft: { x: 0, y: h - 1 },
      };

      const points = [
        this.findLargeAnchorInWindow(gray, cornerWindows.topLeft, "outer-topLeft", w * h, fallbackCorners.topLeft),
        this.findLargeAnchorInWindow(gray, cornerWindows.topRight, "outer-topRight", w * h, fallbackCorners.topRight),
        this.findLargeAnchorInWindow(gray, cornerWindows.bottomRight, "outer-bottomRight", w * h, fallbackCorners.bottomRight),
        this.findLargeAnchorInWindow(gray, cornerWindows.bottomLeft, "outer-bottomLeft", w * h, fallbackCorners.bottomLeft),
      ];

      const hasFallback = points.some((p, idx) => {
        const key = ["topLeft", "topRight", "bottomRight", "bottomLeft"][idx];
        const fb = fallbackCorners[key];
        return Math.round(p.x) === fb.x && Math.round(p.y) === fb.y;
      });

      if (hasFallback && this.config.debug) {
        console.warn("[OUTER ANCHOR] Một hoặc nhiều điểm neo không tìm thấy, dùng tạm góc ảnh để tiếp tục quét.");
      }

      return orderPoints(points);
    } finally {
      gray.delete();
    }
  }

  findLargeAnchorInWindow(grayMat, windowRect, anchorLabel, imageArea, fallbackPoint = null) {
    const roi = grayMat.roi(
      new cv.Rect(windowRect.x, windowRect.y, windowRect.width, windowRect.height)
    );
    const adaptive = new cv.Mat();
    const otsu = new cv.Mat();
    const blended = new cv.Mat();
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    try {
      // Nhị phân hóa cục bộ để nổi bật chấm đen trong vùng góc bị bóng/ám xám.
      cv.adaptiveThreshold(
        roi,
        adaptive,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        31,
        7
      );
      cv.threshold(roi, otsu, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
      cv.bitwise_or(adaptive, otsu, blended);
      cv.morphologyEx(blended, blended, cv.MORPH_OPEN, kernel);
      cv.morphologyEx(blended, blended, cv.MORPH_CLOSE, kernel);

      cv.findContours(blended, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

      const windowArea = windowRect.width * windowRect.height;
      const minAreaForAnchor = Math.max(windowArea * 0.0012, imageArea * 0.00005, 18);
      const maxAreaForAnchor = Math.min(windowArea * 0.65, imageArea * 0.2);

      const getExpectedCorner = () => {
        if (anchorLabel.includes("topLeft")) return { x: 0, y: 0 };
        if (anchorLabel.includes("topRight")) return { x: windowRect.width - 1, y: 0 };
        if (anchorLabel.includes("bottomRight")) return { x: windowRect.width - 1, y: windowRect.height - 1 };
        return { x: 0, y: windowRect.height - 1 };
      };

      const expectedCorner = getExpectedCorner();
      const maxCornerDistance = Math.max(1, Math.hypot(windowRect.width, windowRect.height));

      let bestStrict = null;
      let bestRelaxed = null;
      for (let i = 0; i < contours.size(); i += 1) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        if (area < minAreaForAnchor || area > maxAreaForAnchor) {
          contour.delete();
          continue;
        }

        const rect = cv.boundingRect(contour);
        const aspect = rect.width / Math.max(1, rect.height);
        
        if (aspect < 0.45 || aspect > 1.9) {
          contour.delete();
          continue;
        }

        const perimeter = cv.arcLength(contour, true);
        const circularity = (4 * Math.PI * area) / (perimeter * perimeter + 1e-6);
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        const cornerDistance = Math.hypot(centerX - expectedCorner.x, centerY - expectedCorner.y);

        const areaScore = area / Math.max(1, windowArea);
        const cornerScore = 1 - cornerDistance / maxCornerDistance;
        const shapeScore = 1 - Math.min(1, Math.abs(aspect - 1));
        const score = areaScore * 0.5 + cornerScore * 0.25 + shapeScore * 0.15 + circularity * 0.1;

        if (circularity >= 0.35) {
          if (!bestStrict || score > bestStrict.score) {
            if (bestStrict?.contour) bestStrict.contour.delete();
            bestStrict = { contour, rect, score };
          } else {
            contour.delete();
          }
        } else {
          if (!bestRelaxed || score > bestRelaxed.score) {
            if (bestRelaxed?.contour) bestRelaxed.contour.delete();
            bestRelaxed = { contour, rect, score };
          } else {
            contour.delete();
          }
        }
      }

      const best = bestStrict || bestRelaxed;

      if (!best) {
        if (fallbackPoint) {
          if (this.config.debug) {
            console.warn(`[OUTER ANCHOR] ${anchorLabel} không tìm thấy contour phù hợp, fallback -> (${fallbackPoint.x}, ${fallbackPoint.y})`);
          }
          return fallbackPoint;
        }
        throw new Error(`Không tìm thấy chấm neo trong vùng ${anchorLabel}`);
      }

      const x = windowRect.x + best.rect.x + best.rect.width / 2;
      const y = windowRect.y + best.rect.y + best.rect.height / 2;

      if (this.config.debug) {
        const mode = bestStrict ? "strict" : "relaxed";
        console.log(`[OUTER ANCHOR] ${anchorLabel} -> (${Math.round(x)}, ${Math.round(y)}) mode=${mode} area=${Math.round(best.rect.width)}x${Math.round(best.rect.height)}`);
      }

      best.contour.delete();
      return { x, y };
    } finally {
      roi.delete();
      adaptive.delete();
      otsu.delete();
      blended.delete();
      kernel.delete();
      contours.delete();
      hierarchy.delete();
    }
  }

  detectRegionAnchors(pageBinary, width, height) {
    const regionTemplates = {
      sbd: { x: 0.53, y: 0.12, w: 0.15, h: 0.32 },
      maDe: { x: 0.80, y: 0.12, w: 0.13, h: 0.32 },
      answers: { x: 0.08, y: 0.42, w: 0.84, h: 0.525 },
    };

    const detectRegion = (name, ratioRect) => {
      const regionRect = rectFromRatio(width, height, ratioRect);
      const windows = regionCornerWindows(regionRect, width, height);
      const fallbackCorners = {
        topLeft: { x: regionRect.x, y: regionRect.y },
        topRight: { x: regionRect.x + regionRect.width - 1, y: regionRect.y },
        bottomRight: { x: regionRect.x + regionRect.width - 1, y: regionRect.y + regionRect.height - 1 },
        bottomLeft: { x: regionRect.x, y: regionRect.y + regionRect.height - 1 },
      };

      const points = [
        this.findAnchorPointInWindow(pageBinary, windows.topLeft, `${name}-topLeft`, fallbackCorners.topLeft),
        this.findAnchorPointInWindow(pageBinary, windows.topRight, `${name}-topRight`, fallbackCorners.topRight),
        this.findAnchorPointInWindow(pageBinary, windows.bottomRight, `${name}-bottomRight`, fallbackCorners.bottomRight),
        this.findAnchorPointInWindow(pageBinary, windows.bottomLeft, `${name}-bottomLeft`, fallbackCorners.bottomLeft),
      ];

      const hasFallback = points.some((p, idx) => {
        const key = ["topLeft", "topRight", "bottomRight", "bottomLeft"][idx];
        const fb = fallbackCorners[key];
        return Math.round(p.x) === fb.x && Math.round(p.y) === fb.y;
      });

      const missingIndices = [];
      points.forEach((p, idx) => {
        const key = ["topLeft", "topRight", "bottomRight", "bottomLeft"][idx];
        const fb = fallbackCorners[key];
        if (Math.round(p.x) === fb.x && Math.round(p.y) === fb.y) {
          missingIndices.push(idx);
        }
      });

      const isNumericRegion = name === "sbd" || name === "maDe";
      const forceFixedNumericTemplate = true;

      if (isNumericRegion && forceFixedNumericTemplate) {
        if (this.config.debug) {
          console.warn(
            `[REGION ANCHOR] ${name}: dùng khung template cố định để ổn định decode numeric (giảm nhiễu do neo vùng).`
          );
        }
        return orderPoints([
          fallbackCorners.topLeft,
          fallbackCorners.topRight,
          fallbackCorners.bottomRight,
          fallbackCorners.bottomLeft,
        ]);
      }

      // Numeric region rất nhạy với méo phối cảnh: nếu thiếu neo thì ưu tiên khung template cố định.
      if (isNumericRegion && missingIndices.length > 0) {
        if (this.config.debug) {
          console.warn(
            `[REGION ANCHOR] ${name}: thiếu neo (${missingIndices.length}), dùng khung template cố định để ổn định decode numeric.`
          );
        }
        return orderPoints([
          fallbackCorners.topLeft,
          fallbackCorners.topRight,
          fallbackCorners.bottomRight,
          fallbackCorners.bottomLeft,
        ]);
      }

      if (missingIndices.length === 1) {
        const missingIndex = missingIndices[0];
        const [tl, tr, br, bl] = points;
        let interpolated = null;

        if (missingIndex === 0) interpolated = { x: tr.x + bl.x - br.x, y: tr.y + bl.y - br.y };
        if (missingIndex === 1) interpolated = { x: tl.x + br.x - bl.x, y: tl.y + br.y - bl.y };
        if (missingIndex === 2) interpolated = { x: tr.x + bl.x - tl.x, y: tr.y + bl.y - tl.y };
        if (missingIndex === 3) interpolated = { x: tl.x + br.x - tr.x, y: tl.y + br.y - tr.y };

        if (interpolated) {
          points[missingIndex] = {
            x: Math.min(width - 1, Math.max(0, interpolated.x)),
            y: Math.min(height - 1, Math.max(0, interpolated.y)),
          };

          if (this.config.debug) {
            const labels = ["topLeft", "topRight", "bottomRight", "bottomLeft"];
            console.warn(
              `[REGION ANCHOR] ${name}: nội suy điểm ${labels[missingIndex]} từ 3 điểm còn lại thay vì dùng fallback cố định.`
            );
          }
        }
      }

      const stillHasFallback = points.some((p, idx) => {
        const key = ["topLeft", "topRight", "bottomRight", "bottomLeft"][idx];
        const fb = fallbackCorners[key];
        return Math.round(p.x) === fb.x && Math.round(p.y) === fb.y;
      });

      if (stillHasFallback && this.config.debug) {
        console.warn(`[REGION ANCHOR] ${name}: thiếu một số điểm neo, đang dùng góc vùng dự phòng.`);
      }

      // Nếu vẫn thiếu nhiều neo sau nội suy, dùng tọa độ cứng từ warped page để ổn định warp vùng.
      if (missingIndices.length > 1) {
        return orderPoints([
          fallbackCorners.topLeft,
          fallbackCorners.topRight,
          fallbackCorners.bottomRight,
          fallbackCorners.bottomLeft,
        ]);
      }

      return orderPoints(points);
    };

    return {
      sbd: detectRegion("sbd", regionTemplates.sbd),
      maDe: detectRegion("maDe", regionTemplates.maDe),
      answers: detectRegion("answers", regionTemplates.answers),
    };
  }

  findAnchorPointInWindow(binaryMat, windowRect, anchorLabel = "anchor", fallbackPoint = null) {
    // Phương thức này phục vụ cho SBD/Mã đề - tìm contour nhỏ hơn
    const roi = binaryMat.roi(
      new cv.Rect(windowRect.x, windowRect.y, windowRect.width, windowRect.height)
    );
    const refined = new cv.Mat();
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    try {
      // Làm sạch ROI để giữ các blob neo nhỏ trong vùng SBD/Mã đề.
      cv.morphologyEx(roi, refined, cv.MORPH_OPEN, kernel);
      cv.morphologyEx(refined, refined, cv.MORPH_CLOSE, kernel);

      cv.findContours(refined, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

      const getExpectedCorner = () => {
        if (anchorLabel.includes("topLeft")) return { x: 0, y: 0 };
        if (anchorLabel.includes("topRight")) return { x: windowRect.width - 1, y: 0 };
        if (anchorLabel.includes("bottomRight")) return { x: windowRect.width - 1, y: windowRect.height - 1 };
        return { x: 0, y: windowRect.height - 1 };
      };

      const expectedCorner = getExpectedCorner();
      const maxCornerDistance = Math.max(1, Math.hypot(windowRect.width, windowRect.height));

      let bestStrict = null;
      let bestRelaxed = null;
      for (let i = 0; i < contours.size(); i += 1) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        const minArea = Math.max(10, windowRect.width * windowRect.height * 0.0008);
        const maxArea = Math.max(40, windowRect.width * windowRect.height * 0.35);
        if (area < minArea || area > maxArea) {
          contour.delete();
          continue;
        }

        const rect = cv.boundingRect(contour);
        const aspect = rect.width / Math.max(1, rect.height);
        if (aspect < 0.45 || aspect > 2.1) {
          contour.delete();
          continue;
        }

        const perimeter = cv.arcLength(contour, true);
        const circularity = (4 * Math.PI * area) / (perimeter * perimeter + 1e-6);
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        const cornerDistance = Math.hypot(centerX - expectedCorner.x, centerY - expectedCorner.y);

        const areaScore = area / Math.max(1, windowRect.width * windowRect.height);
        const cornerScore = 1 - cornerDistance / maxCornerDistance;
        const shapeScore = 1 - Math.min(1, Math.abs(aspect - 1));
        const score = areaScore * 0.45 + cornerScore * 0.35 + shapeScore * 0.1 + circularity * 0.1;

        if (circularity >= 0.3) {
          if (!bestStrict || score > bestStrict.score) {
            if (bestStrict?.contour) bestStrict.contour.delete();
            bestStrict = { contour, rect, score };
          } else {
            contour.delete();
          }
        } else {
          if (!bestRelaxed || score > bestRelaxed.score) {
            if (bestRelaxed?.contour) bestRelaxed.contour.delete();
            bestRelaxed = { contour, rect, score };
          } else {
            contour.delete();
          }
        }
      }

      const best = bestStrict || bestRelaxed;

      if (!best) {
        if (fallbackPoint) {
          if (this.config.debug) {
            console.warn(
              `[REGION ANCHOR] ${anchorLabel} không tìm thấy contour phù hợp, fallback -> (${Math.round(fallbackPoint.x)}, ${Math.round(fallbackPoint.y)})`
            );
          }
          return fallbackPoint;
        }
        throw new Error(`Không tìm thấy điểm neo trong vùng ${anchorLabel}`);
      }

      const x = windowRect.x + best.rect.x + best.rect.width / 2;
      const y = windowRect.y + best.rect.y + best.rect.height / 2;

      if (this.config.debug) {
        const mode = bestStrict ? "strict" : "relaxed";
        console.log(`[REGION ANCHOR] ${anchorLabel} -> (${Math.round(x)}, ${Math.round(y)}) mode=${mode}`);
      }

      best.contour.delete();
      return { x, y };
    } finally {
      roi.delete();
      refined.delete();
      kernel.delete();
      contours.delete();
      hierarchy.delete();
    }
  }

  async processByRegionAnchors(source, anchors, regionOptions = {}) {
    assertCvReady();

    const canvas = await createCanvasFromSource(source);
    const src = cv.imread(canvas);

    let sbdColor = null;
    let maDeColor = null;
    let answersColor = null;

    let sbdBinary = null;
    let maDeBinary = null;
    let answersBinary = null;

    let sbdOverlay = null;
    let maDeOverlay = null;
    let answersOverlay = null;

    try {
      const sbdAnchors = normalizeAnchorInput(anchors?.sbd, "SBD");
      const maDeAnchors = normalizeAnchorInput(anchors?.maDe, "Mã đề");
      const answersAnchors = normalizeAnchorInput(anchors?.answers, "Câu hỏi");

      const sbdSize = regionOptions?.sbdSize || inferWarpSize(sbdAnchors, 200, 300);
      const maDeSize = regionOptions?.maDeSize || inferWarpSize(maDeAnchors, 160, 300);
      const answersSize = regionOptions?.answersSize || inferWarpSize(answersAnchors, 800, 1200);

      sbdColor = this.warpRegionByAnchors(src, sbdAnchors, sbdSize);
      maDeColor = this.warpRegionByAnchors(src, maDeAnchors, maDeSize);
      answersColor = this.warpRegionByAnchors(src, answersAnchors, answersSize);

      sbdBinary = this.preprocessSbdForContours(sbdColor);
      maDeBinary = this.preprocessToBinary(maDeColor);
      answersBinary = this.preprocessToBinary(answersColor);

      const sbdResult = this.detectNumericGrid(sbdBinary, {
        digitColumns: 5,
        digitRows: 10,
        label: "SBD",
      });

      const maDeResult = this.detectNumericGrid(maDeBinary, {
        digitColumns: 3,
        digitRows: 10,
        label: "MãĐề",
      });

      const answerBubbles = this.detectBubblesWithRetry(
        answersBinary,
        answersColor.cols * answersColor.rows,
        {
          preDilateIterations: 0,
          extraAreaRelax: 1.15,
          minAreaRatioScale: 0.85,
          minCircularity: 0.22,
          targetCount: this.config.expectedQuestions * this.config.choicesPerQuestion,
          minDensity: 0.075,
        }
      );

      // *** DÙNG DYNAMIC ROW ALIGNMENT CHO ANSWERS ***
      const answerStructured = this.sortAndGroupBubblesWithDynamicRows(answerBubbles);
      const answerResult = this.detectAnswers(answersBinary, answerStructured, {
        detectedBubbleCount: answerBubbles.length,
      });

      sbdOverlay = this.drawNumericDebugOverlay(sbdColor, sbdResult.items, sbdResult.value, "SBD");
      maDeOverlay = this.drawNumericDebugOverlay(maDeColor, maDeResult.items, maDeResult.value, "Mã đề");
      answersOverlay = this.drawDebugOverlay(answersColor, answerStructured, answerResult);

      return {
        mssv: toFixedDigits(sbdResult.value, 5),
        maDe: toFixedDigits(maDeResult.value, 3),
        answers: answerResult.answersMap,
        debug: {
          sbdOverlayCanvas: this.matToCanvas(sbdOverlay),
          maDeOverlayCanvas: this.matToCanvas(maDeOverlay),
          answersOverlayCanvas: this.matToCanvas(answersOverlay),
          sbdLogs: sbdResult.logs,
          maDeLogs: maDeResult.logs,
          answerLogs: answerResult.logs,
        },
      };
    } finally {
      src.delete();

      if (sbdColor) sbdColor.delete();
      if (maDeColor) maDeColor.delete();
      if (answersColor) answersColor.delete();

      if (sbdBinary) sbdBinary.delete();
      if (maDeBinary) maDeBinary.delete();
      if (answersBinary) answersBinary.delete();

      if (sbdOverlay) sbdOverlay.delete();
      if (maDeOverlay) maDeOverlay.delete();
      if (answersOverlay) answersOverlay.delete();
    }
  }

  warpRegionByAnchors(src, orderedPoints, targetSize) {
    const [tl, tr, br, bl] = orderedPoints;
    const width = Math.max(20, Math.round(targetSize.width));
    const height = Math.max(20, Math.round(targetSize.height));

    const srcTri = cv.matFromArray(
      4,
      1,
      cv.CV_32FC2,
      [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]
    );
    const dstTri = cv.matFromArray(
      4,
      1,
      cv.CV_32FC2,
      [0, 0, width - 1, 0, width - 1, height - 1, 0, height - 1]
    );

    const transform = cv.getPerspectiveTransform(srcTri, dstTri);
    const warped = new cv.Mat();

    cv.warpPerspective(
      src,
      warped,
      transform,
      new cv.Size(width, height),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255)
    );

    srcTri.delete();
    dstTri.delete();
    transform.delete();

    return warped;
  }

  preprocessToBinary(colorMat) {
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const adaptive = new cv.Mat();

    try {
      cv.cvtColor(colorMat, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blurred, new cv.Size(this.config.blurKernel, this.config.blurKernel), 0);
      cv.adaptiveThreshold(
        blurred,
        adaptive,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        this.config.adaptiveBlockSize,
        this.config.adaptiveC
      );
      return this.applyMorphology(adaptive);
    } finally {
      gray.delete();
      blurred.delete();
      adaptive.delete();
    }
  }

  preprocessSbdForContours(colorMat) {
    const gray = new cv.Mat();
    const binaryInv = new cv.Mat();
    const dilated = new cv.Mat();
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));

    try {
      cv.cvtColor(colorMat, gray, cv.COLOR_RGBA2GRAY);
      cv.threshold(gray, binaryInv, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
      cv.dilate(binaryInv, dilated, kernel, new cv.Point(-1, -1), 1);
      return dilated.clone();
    } finally {
      gray.delete();
      binaryInv.delete();
      dilated.delete();
      kernel.delete();
    }
  }

  detectNumericGrid(binaryMat, options = {}) {
    const digitColumns = Number(options.digitColumns || 5);
    const digitRows = Number(options.digitRows || 10);
    const label = options.label || "NUM";
    const minMarkedDensity = Number(options.minMarkedDensity ?? 0.05);
    const isNumericIdField = label === "SBD" || label === "MãĐề";
    const isSbdField = label === "SBD";

    let bubbles = this.detectBubblesWithRetry(binaryMat, binaryMat.cols * binaryMat.rows, {
      minRequired: Math.max(8, Math.floor(digitColumns * digitRows * 0.45)),
      allowLowCountInference: true,
      lowCountFloor: 1,
      allowUltraLowCount: true,
      minAreaRatioScale: isSbdField ? 0.3 : (isNumericIdField ? 0.35 : 1),
      minCircularity: isSbdField ? 0.18 : undefined,
      extraAreaRelax: isNumericIdField ? 0.7 : 1,
      preDilateIterations: isNumericIdField ? 2 : 1,
      minDensity: isNumericIdField ? 0.06 : 0.15,
    });

    if (isNumericIdField) {
      const rescueFloor = isSbdField ? 40 : 24;
      if (bubbles.length < rescueFloor) {
        const rescueBlur = new cv.Mat();
        const rescueBinary = new cv.Mat();
        const rescueKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
        try {
          cv.GaussianBlur(binaryMat, rescueBlur, new cv.Size(3, 3), 0);
          cv.threshold(rescueBlur, rescueBinary, 35, 255, cv.THRESH_BINARY);
          cv.dilate(rescueBinary, rescueBinary, rescueKernel, new cv.Point(-1, -1), 2);

          const rescueBubbles = this.detectBubblesWithRetry(
            rescueBinary,
            rescueBinary.cols * rescueBinary.rows,
            {
              minRequired: Math.max(8, Math.floor(digitColumns * digitRows * 0.35)),
              allowLowCountInference: true,
              lowCountFloor: 1,
              allowUltraLowCount: true,
              minAreaRatioScale: isSbdField ? 0.22 : 0.28,
              minCircularity: 0,
              extraAreaRelax: 0.5,
              preDilateIterations: 3,
              minDensity: 0.04,
              disableCircularityInRescue: true,
            }
          );

          if (rescueBubbles.length > bubbles.length) {
            bubbles.forEach((b) => b.contour.delete());
            bubbles = rescueBubbles;
            if (this.config.debug) {
              console.warn(
                `[${label}] Rescue preprocess cải thiện bubble: ${bubbles.length} (floor=${rescueFloor}).`
              );
            }
          } else {
            rescueBubbles.forEach((b) => b.contour.delete());
          }
        } finally {
          rescueBlur.delete();
          rescueBinary.delete();
          rescueKernel.delete();
        }
      }
    }

    if (isSbdField && this.config.debug) {
      console.log(`SBD Contours Found: ${bubbles.length}`);
    }

    const localBlur = new cv.Mat();
    const localAdaptive = new cv.Mat();
    const localSource = new cv.Mat();
    try {
      cv.GaussianBlur(binaryMat, localBlur, new cv.Size(5, 5), 0);
      cv.adaptiveThreshold(
        localBlur,
        localAdaptive,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        31,
        4
      );

      // Nếu adaptive cục bộ làm rỗng ảnh (thường gặp khi input đã là binary), fallback về binary gốc.
      const adaptiveNonZero = cv.countNonZero(localAdaptive);
      const minUsefulPixels = Math.max(1, Math.floor(binaryMat.rows * binaryMat.cols * 0.003));
      if (adaptiveNonZero < minUsefulPixels) {
        binaryMat.copyTo(localSource);
        if (this.config.debug) {
          console.warn(
            `[${label}] Adaptive local quá rỗng (${adaptiveNonZero}px), fallback dùng binary gốc để tính density.`
          );
        }
      } else {
        localAdaptive.copyTo(localSource);
      }

      if (bubbles.length < Math.max(2, digitColumns)) {
        if (this.config.debug) {
          console.warn(
            `[${label}] Bubble quá ít (${bubbles.length}) < số cột (${digitColumns}). ` +
            `Dùng fallback giá trị mặc định để tránh dừng pipeline.`
          );
        }

        const digits = Array.from({ length: digitColumns }, () => 0);
        const items = bubbles.map((bubble, idx) => ({
          column: idx,
          row: 0,
          rect: bubble.rect,
          selected: true,
        }));

        const logs = [{
          warning: "insufficient_bubbles_for_fixed_slices",
          detectedBubbles: bubbles.length,
          requiredColumns: digitColumns,
        }];

        return {
          value: digits.join(""),
          items,
          logs,
        };
      }

      const interpolateCenters = (sortedValues, count, fallbackStart, fallbackEnd) => {
        if (!sortedValues.length) {
          const span = Math.max(1, fallbackEnd - fallbackStart);
          return Array.from({ length: count }, (_, i) => fallbackStart + (span * i) / Math.max(1, count - 1));
        }

        if (sortedValues.length === count) return sortedValues;

        const start = sortedValues[0];
        const end = sortedValues[sortedValues.length - 1];
        const span = Math.max(1, end - start);
        return Array.from({ length: count }, (_, i) => start + (span * i) / Math.max(1, count - 1));
      };

      const lowContourSupport =
        isNumericIdField && bubbles.length < Math.max(8, Math.floor(digitColumns * digitRows * 0.45));
      const forceUniformGridNumeric = isNumericIdField;

      const sampleDensityAt = (centerX, centerY, radius) => {
        const r = Math.max(2, Math.floor(radius));
        const x = Math.max(0, Math.floor(centerX - r));
        const y = Math.max(0, Math.floor(centerY - r));
        const w = Math.max(1, Math.min(localSource.cols - x, r * 2 + 1));
        const h = Math.max(1, Math.min(localSource.rows - y, r * 2 + 1));
        if (x >= localSource.cols || y >= localSource.rows || w <= 0 || h <= 0) return 0;

        const roi = localSource.roi(new cv.Rect(x, y, w, h));
        try {
          return cv.countNonZero(roi) / Math.max(1, w * h);
        } finally {
          roi.delete();
        }
      };

      const sampleContrastAt = (centerX, centerY, innerRadius, outerRadius) => {
        const inner = sampleDensityAt(centerX, centerY, innerRadius);
        const outer = sampleDensityAt(centerX, centerY, outerRadius);
        return inner - outer * 0.85;
      };

      const byYAll = [...bubbles].sort((a, b) => a.centerY - b.centerY);
      const medianHeight = median(byYAll.map((b) => b.rect.height));
      const yTolerance = Math.max(6, medianHeight * 0.9);
      const rowClusters = [];
      byYAll.forEach((bubble) => {
        const last = rowClusters[rowClusters.length - 1];
        if (last && Math.abs(last.meanY - bubble.centerY) <= yTolerance) {
          last.items.push(bubble);
          last.meanY = last.items.reduce((sum, it) => sum + it.centerY, 0) / last.items.length;
        } else {
          rowClusters.push({ meanY: bubble.centerY, items: [bubble] });
        }
      });
      const rawRowCenters = rowClusters.map((r) => r.meanY).sort((a, b) => a - b);
      const rowCenters = (forceUniformGridNumeric || lowContourSupport)
        ? Array.from({ length: digitRows }, (_, i) => ((i + 0.5) * binaryMat.rows) / digitRows)
        : interpolateCenters(rawRowCenters, digitRows, 0, binaryMat.rows - 1);

      const byXAll = [...bubbles].sort((a, b) => a.centerX - b.centerX);
      const medianWidth = median(byXAll.map((b) => b.rect.width));
      const xTolerance = Math.max(8, medianWidth * 1.2);
      const colClusters = [];
      byXAll.forEach((bubble) => {
        const last = colClusters[colClusters.length - 1];
        if (last && Math.abs(last.meanX - bubble.centerX) <= xTolerance) {
          last.items.push(bubble);
          last.meanX = last.items.reduce((sum, it) => sum + it.centerX, 0) / last.items.length;
        } else {
          colClusters.push({ meanX: bubble.centerX, items: [bubble] });
        }
      });
      const rawColCenters = colClusters.map((c) => c.meanX).sort((a, b) => a - b);
      const colCenters = (forceUniformGridNumeric || lowContourSupport)
        ? Array.from({ length: digitColumns }, (_, i) => ((i + 0.5) * binaryMat.cols) / digitColumns)
        : interpolateCenters(rawColCenters, digitColumns, 0, binaryMat.cols - 1);

      const digits = [];
      const items = [];
      const logs = [];

      const densityGrid = Array.from({ length: digitRows }, () =>
        Array.from({ length: digitColumns }, () => 0)
      );
      const scoreGrid = Array.from({ length: digitRows }, () =>
        Array.from({ length: digitColumns }, () => 0)
      );
      const bubbleGrid = Array.from({ length: digitRows }, () =>
        Array.from({ length: digitColumns }, () => null)
      );

      const nearestIndex = (value, centers) => {
        let bestIdx = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        centers.forEach((center, idx) => {
          const d = Math.abs(value - center);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = idx;
          }
        });
        return bestIdx;
      };

      if (forceUniformGridNumeric || lowContourSupport) {
        const cellW = binaryMat.cols / Math.max(1, digitColumns);
        const cellH = binaryMat.rows / Math.max(1, digitRows);
        const radius = Math.max(3, Math.min(cellW, cellH) * 0.28);

        for (let rowIdx = 0; rowIdx < digitRows; rowIdx += 1) {
          for (let colIdx = 0; colIdx < digitColumns; colIdx += 1) {
            const centerX = colCenters[colIdx];
            const centerY = rowCenters[rowIdx];
            const density = sampleDensityAt(centerX, centerY, radius);
            const contrast = sampleContrastAt(centerX, centerY, radius, radius * 1.9);
            densityGrid[rowIdx][colIdx] = density;
            scoreGrid[rowIdx][colIdx] = contrast;
          }
        }

        if (this.config.debug) {
          const mode = forceUniformGridNumeric ? "fixed-grid" : "low-support";
          console.warn(
            `[${label}] Uniform-grid sampling (${mode}, contours=${bubbles.length}) -> decode numeric bằng lưới cố định.`
          );
        }
      } else {
        bubbles.forEach((bubble) => {
          const rowIdx = nearestIndex(bubble.centerY, rowCenters);
          const colIdx = nearestIndex(bubble.centerX, colCenters);
          const density = this.computeContourDensity(localSource, bubble.contour, {
            erode: true,
            erodeKernelSize: 3,
          });

          if (density > densityGrid[rowIdx][colIdx]) {
            densityGrid[rowIdx][colIdx] = density;
            scoreGrid[rowIdx][colIdx] = density;
            bubbleGrid[rowIdx][colIdx] = bubble;
          }
        });
      }

      const rowBias = Array.from({ length: digitRows }, (_, rowIndex) => {
        const sum = scoreGrid[rowIndex].reduce((acc, value) => acc + value, 0);
        return sum / Math.max(1, digitColumns);
      });

      for (let colIndex = 0; colIndex < digitColumns; colIndex += 1) {
        const center = colCenters[colIndex];
        const prev = colIndex > 0 ? colCenters[colIndex - 1] : 0;
        const next = colIndex < digitColumns - 1 ? colCenters[colIndex + 1] : binaryMat.cols - 1;
        const xMin = colIndex > 0 ? (prev + center) / 2 : 0;
        const xMax = colIndex < digitColumns - 1 ? (center + next) / 2 : binaryMat.cols;

        if (this.config.debug) {
          console.log(
            `[${label}] COLUMN C${colIndex + 1}: x=[${Math.round(xMin)},${Math.round(xMax)}] center=${Math.round(center)}`
          );
        }

        const rowMaxDensity = Array.from({ length: digitRows }, (_, rowIndex) =>
          densityGrid[rowIndex][colIndex] || 0
        );
        const rowMaxScore = Array.from({ length: digitRows }, (_, rowIndex) =>
          scoreGrid[rowIndex][colIndex] || 0
        );
        const rowBestBubble = Array.from({ length: digitRows }, (_, rowIndex) =>
          bubbleGrid[rowIndex][colIndex]
        );
        const colBubbleCount = rowBestBubble.filter(Boolean).length;
        const sampleSupportCount = rowMaxDensity.filter((d) => d >= Math.max(minMarkedDensity, 0.04)).length;
        const sortedDensityDesc = [...rowMaxDensity].sort((a, b) => b - a);
        const secondDensity = sortedDensityDesc[1] || 0;
        const rawPeakDensity = Math.max(...rowMaxDensity);
        const rawPeakDigit = rowMaxDensity.indexOf(rawPeakDensity);
        const row0Density = rowMaxDensity[0] || 0;

        const rowAdjustedScore = [...rowMaxScore];
        if (lowContourSupport) {
          const topMean = rowMaxScore.slice(0, Math.min(3, digitRows)).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(3, digitRows));
          const bottomSlice = rowMaxScore.slice(Math.max(0, digitRows - 3));
          const bottomMean = bottomSlice.reduce((a, b) => a + b, 0) / Math.max(1, bottomSlice.length);
          const slope = bottomMean - topMean;

          if (slope > 0) {
            for (let rowIndex = 0; rowIndex < digitRows; rowIndex += 1) {
              const t = rowIndex / Math.max(1, digitRows - 1);
              rowAdjustedScore[rowIndex] -= slope * t * 1.35;
            }
          }
        }

        let selectedDigit = 0;
        let selectedDensity = rowMaxDensity[0] || 0;
        const rowBiasWeight = isNumericIdField ? (lowContourSupport ? 0.35 : 0.2) : 0.85;
        let bestScore = rowAdjustedScore[0] - rowBias[0] * rowBiasWeight;
        for (let rowIndex = 1; rowIndex < digitRows; rowIndex += 1) {
          const score = rowAdjustedScore[rowIndex] - rowBias[rowIndex] * rowBiasWeight;
          if (score > bestScore) {
            bestScore = score;
            selectedDensity = rowMaxDensity[rowIndex];
            selectedDigit = rowIndex;
          }
        }

        const sortedColScore = [...rowAdjustedScore].sort((a, b) => b - a);
        const secondScore = sortedColScore[1] || 0;
        const winnerGap = bestScore - secondScore;
        const densityGap = rawPeakDensity - secondDensity;
        const strongNonZeroByDensity =
          !lowContourSupport &&
          rawPeakDigit !== 0 &&
          rawPeakDensity >= (isSbdField ? 0.46 : 0.52) &&
          (rawPeakDensity - row0Density) >= (isSbdField ? 0.18 : 0.22) &&
          densityGap >= (isSbdField ? 0.16 : 0.20);

        if (isNumericIdField && strongNonZeroByDensity) {
          selectedDigit = rawPeakDigit;
          selectedDensity = rawPeakDensity;
        }

        // Với vùng numeric, nếu cột có tín hiệu mơ hồ thì ép về 0 để tránh đọc sai thành 8/9.
        if (isNumericIdField) {
          const sparseColumn = lowContourSupport
            ? sampleSupportCount < 1
            : colBubbleCount < (isSbdField ? 3 : 2);
          const lowAbsThreshold = lowContourSupport
            ? Math.max(minMarkedDensity, isSbdField ? 0.18 : 0.22)
            : Math.max(minMarkedDensity, isSbdField ? 0.16 : 0.20);
          const lowGapThreshold = lowContourSupport ? 0.09 : 0.08;
          const lowAbs = selectedDensity < lowAbsThreshold;
          const lowGap = winnerGap < lowGapThreshold;
          const row0Score = rowAdjustedScore[0] - rowBias[0] * rowBiasWeight;
          const weakVsZero = selectedDigit !== 0 && bestScore < row0Score + (lowContourSupport ? 0.04 : 0.02);
          const weakDensityVsZero = selectedDigit !== 0 && selectedDensity < row0Density + (lowContourSupport ? 0.08 : 0.06);
          if (!strongNonZeroByDensity && (sparseColumn || lowAbs || lowGap || weakVsZero || weakDensityVsZero)) {
            selectedDigit = 0;
            selectedDensity = row0Density;
          }
        }

        digits.push(selectedDigit);

        const rowDensityLog = {};
        for (let rowIndex = 0; rowIndex < digitRows; rowIndex += 1) {
          rowDensityLog[String(rowIndex)] = Number((rowMaxDensity[rowIndex] || 0).toFixed(4));
        }

        logs.push({
          column: colIndex,
          selectedDigit,
          densities: rowDensityLog,
          selectedDensity: Number(selectedDensity.toFixed(4)),
          rowBias: Number((rowBias[selectedDigit] || 0).toFixed(4)),
          rowBiasWeight: Number(rowBiasWeight.toFixed(4)),
          rawPeakDigit,
          rawPeakDensity: Number(rawPeakDensity.toFixed(4)),
          densityGap: Number(densityGap.toFixed(4)),
          strongNonZeroByDensity,
          colBubbleCount,
          sampleSupportCount,
          lowContourSupport,
          selectedScore: Number(bestScore.toFixed(4)),
          row0Score: Number((rowAdjustedScore[0] - rowBias[0] * rowBiasWeight).toFixed(4)),
          winnerGap: Number(winnerGap.toFixed(4)),
          minMarkedDensity: Number(minMarkedDensity.toFixed(4)),
          lowConfidence: selectedDensity < minMarkedDensity,
        });

        if (this.config.debug && label === "SBD" && colIndex === 4) {
          const densityTable = Array.from({ length: digitRows }, (_, idx) => ({
            digit: idx,
            density: Number((rowMaxDensity[idx] || 0).toFixed(4)),
          }));
          console.table(densityTable);
        }

        rowBestBubble.forEach((bubble, rowIndex) => {
          if (bubble) {
            items.push({
              column: colIndex,
              row: rowIndex,
              rect: bubble.rect,
              selected: rowIndex === selectedDigit,
            });
          } else if (lowContourSupport) {
            const cellW = binaryMat.cols / Math.max(1, digitColumns);
            const cellH = binaryMat.rows / Math.max(1, digitRows);
            items.push({
              column: colIndex,
              row: rowIndex,
              rect: {
                x: Math.round(colCenters[colIndex] - cellW * 0.25),
                y: Math.round(rowCenters[rowIndex] - cellH * 0.25),
                width: Math.round(cellW * 0.5),
                height: Math.round(cellH * 0.5),
              },
              selected: rowIndex === selectedDigit,
            });
          }
        });

        if (this.config.debug) {
          console.log(
            `[${label}] C${colIndex + 1} fixed-slice x=[${Math.round(xMin)},${Math.round(xMax)}] ` +
            `-> ${selectedDigit} | max=${selectedDensity.toFixed(3)} minMark=${minMarkedDensity.toFixed(3)}`
          );
        }
      }

      return {
        value: digits.join(""),
        items,
        logs,
      };
    } finally {
      localBlur.delete();
      localAdaptive.delete();
      localSource.delete();
      bubbles.forEach((b) => b.contour.delete());
    }
  }

  groupBubblesIntoColumnsByXThreshold(bubbles, digitColumns, threshold, label = "NUM") {
    const sortedByX = [...bubbles].sort((a, b) => a.centerX - b.centerX);
    const clusters = [];

    sortedByX.forEach((bubble) => {
      const last = clusters[clusters.length - 1];
      if (!last || Math.abs(bubble.centerX - last.meanX) > threshold) {
        clusters.push({ meanX: bubble.centerX, bubbles: [bubble] });
      } else {
        last.bubbles.push(bubble);
        last.meanX = last.bubbles.reduce((sum, b) => sum + b.centerX, 0) / last.bubbles.length;
      }
    });

    // Ghép cụm gần nhau nếu dư cột (nhiễu split cột).
    while (clusters.length > digitColumns) {
      let mergeIdx = 0;
      let bestGap = Number.POSITIVE_INFINITY;
      for (let i = 0; i < clusters.length - 1; i += 1) {
        const gap = Math.abs(clusters[i + 1].meanX - clusters[i].meanX);
        if (gap < bestGap) {
          bestGap = gap;
          mergeIdx = i;
        }
      }

      const merged = {
        bubbles: [...clusters[mergeIdx].bubbles, ...clusters[mergeIdx + 1].bubbles],
      };
      merged.meanX = merged.bubbles.reduce((sum, b) => sum + b.centerX, 0) / merged.bubbles.length;
      clusters.splice(mergeIdx, 2, merged);
    }

    if (clusters.length === digitColumns) {
      if (this.config.debug) {
        console.log(`[${label}] Group columns by X-threshold=${threshold}px -> ${clusters.length} columns`);
      }
      return clusters.map((cluster) => cluster.bubbles);
    }

    // Fallback khi cụm theo threshold không đủ số cột kỳ vọng.
    const xValues = bubbles.map((b) => b.centerX);
    const colCenters = [...kmeans1D(xValues, digitColumns)].sort((a, b) => a - b);
    const columns = colCenters.map(() => []);
    bubbles.forEach((bubble) => {
      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      colCenters.forEach((center, idx) => {
        const d = Math.abs(bubble.centerX - center);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });
      columns[bestIdx].push(bubble);
    });

    if (this.config.debug) {
      console.warn(
        `[${label}] Group by X-threshold chỉ ra ${clusters.length} cột (kỳ vọng ${digitColumns}), fallback kmeans.`
      );
    }
    return columns;
  }

  computeContourDensity(binaryMat, contour, options = {}) {
    const useErode = Boolean(options.erode);
    const erodeKernelSize = Math.max(3, Number(options.erodeKernelSize || 3));
    const mask = cv.Mat.zeros(binaryMat.rows, binaryMat.cols, cv.CV_8UC1);
    const contourVec = new cv.MatVector();
    contourVec.push_back(contour);
    cv.drawContours(mask, contourVec, 0, new cv.Scalar(255), -1);

    const masked = new cv.Mat();
    cv.bitwise_and(binaryMat, binaryMat, masked, mask);

    let target = masked;
    let eroded = null;
    let erodeKernel = null;

    if (useErode) {
      eroded = new cv.Mat();
      erodeKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(erodeKernelSize, erodeKernelSize));
      cv.erode(masked, eroded, erodeKernel, new cv.Point(-1, -1), 1);
      target = eroded;
    }

    const nonZero = cv.countNonZero(target);
    const area = Math.max(1, cv.countNonZero(mask));
    const density = nonZero / area;

    if (eroded) eroded.delete();
    if (erodeKernel) erodeKernel.delete();
    masked.delete();
    mask.delete();
    contourVec.delete();

    return density;
  }

  drawNumericDebugOverlay(regionColor, items, value, title) {
    const overlay = regionColor.clone();

    items.forEach((item) => {
      const color = item.selected
        ? new cv.Scalar(0, 255, 0, 255)
        : new cv.Scalar(0, 165, 255, 255);

      const pt1 = new cv.Point(item.rect.x, item.rect.y);
      const pt2 = new cv.Point(item.rect.x + item.rect.width, item.rect.y + item.rect.height);
      cv.rectangle(overlay, pt1, pt2, color, 2);
    });

    cv.putText(
      overlay,
      `${title}: ${value}`,
      new cv.Point(8, 20),
      cv.FONT_HERSHEY_SIMPLEX,
      0.6,
      new cv.Scalar(255, 0, 255, 255),
      2
    );

    return overlay;
  }

  drawAnchorOverlay(pageColor, outerAnchors, regionAnchors) {
    const overlay = pageColor.clone();

    const drawPoint = (pt, label) => {
      cv.circle(
        overlay,
        new cv.Point(Math.round(pt.x), Math.round(pt.y)),
        8,
        new cv.Scalar(0, 0, 255, 255),
        -1
      );
      cv.putText(
        overlay,
        label,
        new cv.Point(Math.round(pt.x + 10), Math.round(pt.y - 8)),
        cv.FONT_HERSHEY_SIMPLEX,
        0.45,
        new cv.Scalar(255, 0, 255, 255),
        1
      );
    };

    outerAnchors.forEach((pt, idx) => drawPoint(pt, `O${idx + 1}`));
    regionAnchors.sbd.forEach((pt, idx) => drawPoint(pt, `S${idx + 1}`));
    regionAnchors.maDe.forEach((pt, idx) => drawPoint(pt, `M${idx + 1}`));
    regionAnchors.answers.forEach((pt, idx) => drawPoint(pt, `Q${idx + 1}`));

    return overlay;
  }

  detectDocumentContour(src) {
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const edges = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blurred, new cv.Size(this.config.blurKernel, this.config.blurKernel), 0);
      cv.Canny(blurred, edges, this.config.cannyThreshold1, this.config.cannyThreshold2);

      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      const candidates = [];
      for (let i = 0; i < contours.size(); i += 1) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        if (area < src.cols * src.rows * 0.05) {
          contour.delete();
          continue;
        }

        const perimeter = cv.arcLength(contour, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

        if (approx.rows === 4) {
          candidates.push({ area, approx });
        } else {
          approx.delete();
        }

        contour.delete();
      }

      if (!candidates.length) {
        throw new Error("Không phát hiện được viền tờ giấy (4 điểm). Hãy chụp rõ toàn bộ phiếu.");
      }

      candidates.sort((a, b) => b.area - a.area);
      return candidates[0].approx;
    } finally {
      gray.delete();
      blurred.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
    }
  }

  warpToTopDown(src, documentApprox) {
    const pts = [];
    for (let i = 0; i < documentApprox.data32S.length; i += 2) {
      pts.push({ x: documentApprox.data32S[i], y: documentApprox.data32S[i + 1] });
    }

    documentApprox.delete();

    const [tl, tr, br, bl] = orderPoints(pts);

    const widthA = distance(br, bl);
    const widthB = distance(tr, tl);
    const maxWidth = Math.round(Math.max(widthA, widthB));

    const heightA = distance(tr, br);
    const heightB = distance(tl, bl);
    const maxHeight = Math.round(Math.max(heightA, heightB));

    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
    const dstTri = cv.matFromArray(
      4,
      1,
      cv.CV_32FC2,
      [0, 0, maxWidth - 1, 0, maxWidth - 1, maxHeight - 1, 0, maxHeight - 1]
    );

    const transform = cv.getPerspectiveTransform(srcTri, dstTri);
    const warped = new cv.Mat();
    cv.warpPerspective(
      src,
      warped,
      transform,
      new cv.Size(maxWidth, maxHeight),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255)
    );

    srcTri.delete();
    dstTri.delete();
    transform.delete();

    return warped;
  }

  applyMorphology(thresholded) {
    const cleaned = new cv.Mat();
    const kernel = cv.getStructuringElement(
      cv.MORPH_ELLIPSE,
      new cv.Size(this.config.morphologicalKernel, this.config.morphologicalKernel)
    );

    cv.morphologyEx(thresholded, cleaned, cv.MORPH_OPEN, kernel);
    cv.morphologyEx(cleaned, cleaned, cv.MORPH_CLOSE, kernel);

    kernel.delete();
    return cleaned;
  }

  detectBubblesWithRetry(binaryMat, imageArea, options = {}) {
    const preprocessed = new cv.Mat();
    const dilateKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
    const minAreaRatioScale = Number(options.minAreaRatioScale ?? 1);
    const extraAreaRelax = Number(options.extraAreaRelax ?? 1);
    const preDilateIterations = Math.max(0, Math.floor(Number(options.preDilateIterations ?? 1)));
    const minDensity = Number(options.minDensity ?? 0.15);
    const targetCount = Number.isFinite(options.targetCount) ? Number(options.targetCount) : null;
    const minCircularityOverride =
      typeof options.minCircularity === "number" && Number.isFinite(options.minCircularity)
        ? Number(options.minCircularity)
        : null;
    const strictCircularity = minCircularityOverride ?? this.config.minCircularity;

    if (preDilateIterations > 0) {
      cv.dilate(binaryMat, preprocessed, dilateKernel, new cv.Point(-1, -1), preDilateIterations);
    } else {
      binaryMat.copyTo(preprocessed);
    }

    const profiles = [
      {
        label: "strict",
        minAreaRatio: this.config.minContourAreaRatio * minAreaRatioScale * extraAreaRelax,
        maxAreaRatio: this.config.maxContourAreaRatio,
        minAspectRatio: this.config.minAspectRatio,
        maxAspectRatio: this.config.maxAspectRatio,
        minCircularity: strictCircularity,
        medianMinScale: 0.35,
        medianMaxScale: 2.2,
      },
      {
        label: "balanced",
        minAreaRatio: this.config.minContourAreaRatio * 0.6 * minAreaRatioScale * extraAreaRelax,
        maxAreaRatio: this.config.maxContourAreaRatio * 1.5,
        minAspectRatio: 0.65,
        maxAspectRatio: 1.45,
        minCircularity: 0.3,
        medianMinScale: 0.2,
        medianMaxScale: 3.0,
      },
      {
        label: "relaxed",
        minAreaRatio: this.config.minContourAreaRatio * 0.35 * minAreaRatioScale * extraAreaRelax,
        maxAreaRatio: this.config.maxContourAreaRatio * 2.2,
        minAspectRatio: 0.55,
        maxAspectRatio: 1.65,
        minCircularity: 0.15,
        medianMinScale: 0.12,
        medianMaxScale: 4.0,
      },
    ];

    // Thêm density check để loại bỏ text/khung
    const detectOptions = {
      skipDensityCheck: options.skipDensityCheck || false,
      minDensity,
    };

    const candidateResults = profiles.map((profile) => {
      const bubbles = this.detectBubblesByProfile(preprocessed, imageArea, profile, detectOptions);
      if (this.config.debug) {
        console.log(`[OMR] Bubble profile=${profile.label} -> ${bubbles.length} bubbles (với density check)`);
      }
      return { profile, bubbles };
    });

    const defaultMinRequired = Math.floor(
      this.config.expectedQuestions * this.config.choicesPerQuestion * this.config.minDetectedBubbleRatio
    );
    const minRequired = Math.max(1, Math.floor(options.minRequired ?? defaultMinRequired));
    const allowLowCountInference = Boolean(options.allowLowCountInference);
    const lowCountFloor = Math.max(1, Math.floor(options.lowCountFloor ?? 6));
    const allowUltraLowCount = Boolean(options.allowUltraLowCount);

    const pickBestCandidate = (candidates) => {
      if (!candidates.length) return null;

      if (Number.isFinite(targetCount) && targetCount > 0) {
        const eligible = candidates.filter((c) => c.bubbles.length >= minRequired);
        const source = eligible.length ? eligible : candidates;
        const sorted = [...source].sort((a, b) => {
          const da = Math.abs(a.bubbles.length - targetCount);
          const db = Math.abs(b.bubbles.length - targetCount);
          if (da !== db) return da - db;
          return b.bubbles.length - a.bubbles.length;
        });
        return sorted[0];
      }

      const sorted = [...candidates].sort((a, b) => b.bubbles.length - a.bubbles.length);
      return sorted[0];
    };

    const selectedInitial = pickBestCandidate(candidateResults);
    let selectedProfile = selectedInitial.profile;
    let selectedBubbles = selectedInitial.bubbles;

    // Release contours from unused profile results.
    candidateResults.forEach((candidate) => {
      if (candidate.bubbles !== selectedBubbles) {
        candidate.bubbles.forEach((bubble) => bubble.contour.delete());
      }
    });

    // Rescue pass: nếu quá ít bubble, thử lại không dùng density filter.
    if (selectedBubbles.length < minRequired) {
      const rescueDetectOptions = {
        skipDensityCheck: true,
        minDensity,
        ignoreCircularity: Boolean(options.disableCircularityInRescue),
      };
      const rescueCandidates = profiles.map((profile) => {
        const bubbles = this.detectBubblesByProfile(preprocessed, imageArea, profile, rescueDetectOptions);
        if (this.config.debug) {
          console.log(`[OMR][RESCUE] profile=${profile.label} -> ${bubbles.length} bubbles (skipDensityCheck=true)`);
        }
        return { profile, bubbles };
      });

      const rescueBest = pickBestCandidate(rescueCandidates);

      if (rescueBest && rescueBest.bubbles.length > selectedBubbles.length) {
        selectedBubbles.forEach((bubble) => bubble.contour.delete());
        selectedBubbles = rescueBest.bubbles;
        selectedProfile = rescueBest.profile;

        if (this.config.debug) {
          console.warn(
            `[OMR][RESCUE] Cải thiện số bubble: ${selectedBubbles.length} (profile=${selectedProfile.label})`
          );
        }

        rescueCandidates.slice(1).forEach((candidate) => {
          if (candidate.bubbles !== selectedBubbles) {
            candidate.bubbles.forEach((bubble) => bubble.contour.delete());
          }
        });
      } else {
        rescueCandidates.forEach((candidate) => {
          candidate.bubbles.forEach((bubble) => bubble.contour.delete());
        });
      }
    }

    if (selectedBubbles.length < minRequired) {
      if (allowLowCountInference && selectedBubbles.length >= lowCountFloor) {
        if (this.config.debug) {
          console.warn(
            `[OMR] Bubble count thấp (${selectedBubbles.length}) < ${minRequired}, ` +
            `nhưng vẫn tiếp tục suy luận (lowCountFloor=${lowCountFloor}).`
          );
        }
        preprocessed.delete();
        dilateKernel.delete();
        return selectedBubbles;
      }

      if (allowUltraLowCount && selectedBubbles.length > 0) {
        if (this.config.debug) {
          console.warn(
            `[OMR] Bubble rất thấp (${selectedBubbles.length}) nhưng vẫn giữ pipeline chạy ` +
            `(allowUltraLowCount=true).`
          );
        }
        preprocessed.delete();
        dilateKernel.delete();
        return selectedBubbles;
      }

      if (selectedBubbles.length > 10 && selectedBubbles.length < 22) {
        if (this.config.debug) {
          console.warn(
            `[OMR] Bubble count thấp (${selectedBubbles.length}) nhưng vẫn tiếp tục suy luận vì >10. ` +
            `Bộ ghép câu sẽ cố ước lượng từ các điểm hiện có.`
          );
        }
        preprocessed.delete();
        dilateKernel.delete();
        return selectedBubbles;
      }

      selectedBubbles.forEach((bubble) => bubble.contour.delete());
      preprocessed.delete();
      dilateKernel.delete();
      throw new Error(
        `Số bubble phát hiện quá ít (${selectedBubbles.length}). ` +
        `Tối thiểu cần khoảng ${minRequired} để ghép câu ổn định. ` +
        `Lưu ý: Kiểm tra density và circularity để loại bỏ text/khung.`
      );
    }

    if (this.config.debug) {
      console.log(
        `[OMR] Chọn profile=${selectedProfile.label} với ${selectedBubbles.length} bubbles ` +
        `(sau khi lọc text/khung bằng density check)`
      );
    }

    preprocessed.delete();
    dilateKernel.delete();

    return selectedBubbles;
  }

  detectBubblesByProfile(binaryMat, imageArea, profile, options = {}) {
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    const bubbles = [];

    try {
      cv.findContours(binaryMat, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      const totalContours = contours.size();

      const minArea = imageArea * profile.minAreaRatio;
      const maxArea = imageArea * profile.maxAreaRatio;

      for (let i = 0; i < contours.size(); i += 1) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        if (area < minArea || area > maxArea) {
          contour.delete();
          continue;
        }

        const rect = cv.boundingRect(contour);
        const aspectRatio = rect.width / rect.height;

        if (
          aspectRatio >= profile.minAspectRatio &&
          aspectRatio <= profile.maxAspectRatio
        ) {
          const perimeter = cv.arcLength(contour, true);
          const circularity = (4 * Math.PI * area) / (perimeter * perimeter + 1e-6);

          if (options.ignoreCircularity || circularity > profile.minCircularity) {
            // BƯỚC QUAN TRỌNG: Kiểm tra density (độ đậm) để loại bỏ text/khung
            // Nếu có binaryMat để kiểm tra density
            const density = options.skipDensityCheck ? 1.0 : this.computeContourDensity(binaryMat, contour);
            
            // Bubble thật phải có density >= 0.3 (ít nhất 30% pixel bên trong được tô đen)
            // Text/khung thường có density rất thấp (< 0.15)
            if (density < (options.minDensity ?? 0.15) && !options.skipDensityCheck) {
              if (this.config.debug) {
                console.log(`[DEBUG] Loại bỏ contour (text/khung?) - density=${density.toFixed(3)}, area=${area.toFixed(0)}`);
              }
              contour.delete();
              continue;
            }

            bubbles.push({
              contour,
              rect,
              area,
              density,
              centerX: rect.x + rect.width / 2,
              centerY: rect.y + rect.height / 2,
            });
            continue;
          }
        }

        contour.delete();
      }

      if (!bubbles.length) {
        return [];
      }

      const medArea = median(bubbles.map((b) => b.area));
      const filtered = bubbles.filter((bubble) => {
        const valid =
          bubble.area >= medArea * profile.medianMinScale &&
          bubble.area <= medArea * profile.medianMaxScale;
        if (!valid) bubble.contour.delete();
        return valid;
      });

      if (this.config.debug) {
        console.log(
          `[OMR DEBUG] profile=${profile.label} contours before=${totalContours}, ` +
          `afterGeometryDensity=${bubbles.length}, afterMedianFilter=${filtered.length}`
        );
      }

      return filtered;
    } finally {
      contours.delete();
      hierarchy.delete();
    }
  }

  findDynamicRowAlignment(bubbles) {
    // *** TÌM DÒNG ĐẦU TIÊN & DÒNG CUỐI ĐỘNG ***
    // Hàm này tìm câu 1 và câu cuối để tính rowStep
    
    const xValues = bubbles.map((b) => b.centerX);
    const rawCenters = kmeans1D(xValues, this.config.columnsCount);
    const sortedCenters = [...rawCenters].sort((a, b) => a - b);

    const columnBuckets = sortedCenters.map((center) => ({ center, bubbles: [] }));

    bubbles.forEach((bubble) => {
      let bestIndex = 0;
      let minDistance = Number.POSITIVE_INFINITY;

      sortedCenters.forEach((center, idx) => {
        const d = Math.abs(bubble.centerX - center);
        if (d < minDistance) {
          minDistance = d;
          bestIndex = idx;
        }
      });

      columnBuckets[bestIndex].bubbles.push(bubble);
    });

    const rowAlignmentMap = {}; // { columnIndex: { startY, endY, rowStep, predefinedRows[] } }

    columnBuckets.forEach((bucket, columnIndex) => {
      const byY = [...bucket.bubbles].sort((a, b) => a.centerY - b.centerY);

      if (byY.length < 2) return; // Column quá ít bubble, bỏ qua

      const medianHeight = median(byY.map((b) => b.rect.height));
      const clusterTolerance = Math.max(6, medianHeight * 0.85);
      const minBubblesPerValidRow = Math.max(2, this.config.choicesPerQuestion - 1);

      const rowClusters = [];
      byY.forEach((bubble) => {
        const lastCluster = rowClusters[rowClusters.length - 1];
        if (lastCluster && Math.abs(lastCluster.meanY - bubble.centerY) <= clusterTolerance) {
          lastCluster.items.push(bubble);
          lastCluster.meanY =
            lastCluster.items.reduce((sum, item) => sum + item.centerY, 0) / lastCluster.items.length;
        } else {
          rowClusters.push({ meanY: bubble.centerY, items: [bubble] });
        }
      });

      const validClusters = rowClusters.filter((cluster) => cluster.items.length >= minBubblesPerValidRow);
      const robustClusters = rowClusters.filter((cluster) => cluster.items.length >= 2);
      const anchors = validClusters.length ? validClusters : (robustClusters.length ? robustClusters : rowClusters);
      const firstCluster = anchors[0] || rowClusters[0];
      const lastCluster = anchors[anchors.length - 1] || rowClusters[rowClusters.length - 1];

      let startY = firstCluster.meanY;
      let endY = lastCluster.meanY;
      let safeSpan = Math.max(1, endY - startY);
      let rowStep = safeSpan / Math.max(1, this.config.questionsPerColumn - 1);

      const needsInference =
        byY.length > 10 &&
        validClusters.length < Math.max(3, Math.floor(this.config.questionsPerColumn * 0.35));

      if (needsInference) {
        const orderedCenters = rowClusters.map((cluster) => cluster.meanY).sort((a, b) => a - b);
        const robustCenters = rowClusters
          .filter((cluster) => cluster.items.length >= 2)
          .map((cluster) => cluster.meanY)
          .sort((a, b) => a - b);
        const centersForStep = robustCenters.length >= 2 ? robustCenters : orderedCenters;

        const gaps = [];
        for (let i = 1; i < centersForStep.length; i += 1) {
          const gap = centersForStep[i] - centersForStep[i - 1];
          if (gap > 2) gaps.push(gap);
        }
        const inferredStep = gaps.length ? median(gaps) : rowStep;
        rowStep = Math.max(8, Math.min(60, inferredStep));

        // Dùng anchor robust để tránh outlier làm lệch chỉ số hàng đầu (Q1 bị trượt thành Q5...).
        const centersForAnchor = robustCenters.length ? robustCenters : orderedCenters;
        const anchorIdx = Math.max(0, Math.min(centersForAnchor.length - 1, Math.floor(centersForAnchor.length * 0.2)));
        const anchorY = centersForAnchor[anchorIdx];
        startY = anchorY - anchorIdx * rowStep;
        endY = startY + rowStep * Math.max(1, this.config.questionsPerColumn - 1);
        safeSpan = Math.max(1, endY - startY);
      }

      const predefinedRows = [];
      for (let i = 0; i < this.config.questionsPerColumn; i++) {
        predefinedRows.push({
          rowIndex: i,
          yPosition: startY + i * rowStep,
          tolerance: Math.max(4, rowStep * 0.45),
          items: [],
        });
      }

      rowAlignmentMap[columnIndex] = { startY, endY, rowStep, predefinedRows };

      if (this.config.debug) {
        const firstFiveY = predefinedRows.slice(0, 5).map((row) => Math.round(row.yPosition));
        console.log(
          `[ROW ALIGN] Column ${columnIndex}: startY=${Math.round(startY)}, endY=${Math.round(endY)}, ` +
          `rowStep=${Math.round(rowStep)} (${byY.length} bubbles, validRows=${validClusters.length})`
        );
        console.log(`[ROW ALIGN] Column ${columnIndex}: first5Y=${firstFiveY.join(",")}`);
      }
    });

    const alignEntries = Object.entries(rowAlignmentMap);
    if (alignEntries.length) {
      const starts = alignEntries.map(([, info]) => info.startY).sort((a, b) => a - b);
      const steps = alignEntries.map(([, info]) => info.rowStep).sort((a, b) => a - b);
      const globalStart = starts[Math.floor(starts.length / 2)];
      const globalStep = steps[Math.floor(steps.length / 2)] || 1;

      alignEntries.forEach(([key, info]) => {
        const tooSmall = info.rowStep < globalStep * 0.88;
        const tooLarge = info.rowStep > globalStep * 1.12;
        if (tooSmall || tooLarge) {
          const newStep = globalStep;
          const newRows = [];
          for (let i = 0; i < this.config.questionsPerColumn; i += 1) {
            newRows.push({
              rowIndex: i,
              yPosition: info.startY + i * newStep,
              tolerance: Math.max(4, newStep * 0.45),
              items: [],
            });
          }

          rowAlignmentMap[key] = {
            ...info,
            rowStep: newStep,
            endY: info.startY + newStep * Math.max(1, this.config.questionsPerColumn - 1),
            predefinedRows: newRows,
          };

          if (this.config.debug) {
            const firstFiveY = newRows.slice(0, 5).map((row) => Math.round(row.yPosition));
            console.warn(
              `[ROW ALIGN][STEP-NORM] Column ${key}: rowStep ${Math.round(info.rowStep)} -> ${Math.round(newStep)} | first5Y=${firstFiveY.join(",")}`
            );
          }
        }
      });

      alignEntries.forEach(([key, info]) => {
        const latestInfo = rowAlignmentMap[key] || info;
        if (Math.abs(latestInfo.startY - globalStart) > globalStep * 1.15) {
          const newStart = globalStart;
          const newRows = [];
          for (let i = 0; i < this.config.questionsPerColumn; i += 1) {
            newRows.push({
              rowIndex: i,
              yPosition: newStart + i * latestInfo.rowStep,
              tolerance: Math.max(4, latestInfo.rowStep * 0.45),
              items: [],
            });
          }

          rowAlignmentMap[key] = {
            ...latestInfo,
            startY: newStart,
            endY: newStart + latestInfo.rowStep * Math.max(1, this.config.questionsPerColumn - 1),
            predefinedRows: newRows,
          };

          if (this.config.debug) {
            const firstFiveY = newRows.slice(0, 5).map((row) => Math.round(row.yPosition));
            console.warn(
              `[ROW ALIGN][GLOBAL-NORM] Column ${key}: startY ${Math.round(latestInfo.startY)} -> ${Math.round(newStart)} | first5Y=${firstFiveY.join(",")}`
            );
          }
        }
      });
    }

    return { sortedCenters, columnBuckets, rowAlignmentMap };
  }

  sortAndGroupBubbles(bubbles) {
    const xValues = bubbles.map((b) => b.centerX);
    const rawCenters = kmeans1D(xValues, this.config.columnsCount);
    const sortedCenters = [...rawCenters].sort((a, b) => a - b);

    const columnBuckets = sortedCenters.map((center) => ({ center, bubbles: [] }));

    bubbles.forEach((bubble) => {
      let bestIndex = 0;
      let minDistance = Number.POSITIVE_INFINITY;

      sortedCenters.forEach((center, idx) => {
        const d = Math.abs(bubble.centerX - center);
        if (d < minDistance) {
          minDistance = d;
          bestIndex = idx;
        }
      });

      columnBuckets[bestIndex].bubbles.push(bubble);
    });

    const structured = [];

    columnBuckets.forEach((bucket, columnIndex) => {
      const byY = [...bucket.bubbles].sort((a, b) => a.centerY - b.centerY);
      const medianHeight = median(byY.map((b) => b.rect.height));
      const rowTolerance = Math.max(6, medianHeight * 0.8);

      const rows = [];

      byY.forEach((bubble) => {
        const existingRow = rows.find((row) => Math.abs(row.meanY - bubble.centerY) <= rowTolerance);
        if (existingRow) {
          existingRow.items.push(bubble);
          const totalY = existingRow.items.reduce((acc, item) => acc + item.centerY, 0);
          existingRow.meanY = totalY / existingRow.items.length;
        } else {
          rows.push({ meanY: bubble.centerY, items: [bubble] });
        }
      });

      rows.sort((a, b) => a.meanY - b.meanY);

      rows.forEach((row, rowIndex) => {
        const sortedChoices = [...row.items].sort((a, b) => a.centerX - b.centerX).slice(0, this.config.choicesPerQuestion);
        if (sortedChoices.length === this.config.choicesPerQuestion) {
          structured.push({
            columnIndex,
            rowIndex,
            questionNumber: columnIndex * this.config.questionsPerColumn + rowIndex + 1,
            choices: sortedChoices,
          });
        }
      });
    });

    structured.sort((a, b) => a.questionNumber - b.questionNumber);

    return structured;
  }

  sortAndGroupBubblesWithDynamicRows(bubbles) {
    // *** VERSION v2: DÙNG DYNAMIC ROW ALIGNMENT ***
    const alignment = this.findDynamicRowAlignment(bubbles);
    const { columnBuckets, rowAlignmentMap } = alignment;

    const structured = [];

    columnBuckets.forEach((bucket, columnIndex) => {
      const byY = [...bucket.bubbles].sort((a, b) => a.centerY - b.centerY);
      const alignInfo = rowAlignmentMap[columnIndex];
      const medianWidth = Math.max(8, median(byY.map((b) => b.rect.width)) || 12);
      const medianHeight = Math.max(8, median(byY.map((b) => b.rect.height)) || 12);
      const minX = byY.length ? Math.min(...byY.map((b) => b.centerX)) : 0;
      const maxX = byY.length ? Math.max(...byY.map((b) => b.centerX)) : this.config.choicesPerQuestion * medianWidth;
      const xTolerance = Math.max(8, medianWidth * 1.4);

      let choiceCenters = [];
      if (byY.length >= this.config.choicesPerQuestion) {
        try {
          choiceCenters = [...kmeans1D(byY.map((b) => b.centerX), this.config.choicesPerQuestion)].sort((a, b) => a - b);
        } catch (_err) {
          choiceCenters = [];
        }
      }
      if (choiceCenters.length !== this.config.choicesPerQuestion) {
        const span = Math.max(1, maxX - minX);
        choiceCenters = Array.from(
          { length: this.config.choicesPerQuestion },
          (_, idx) => minX + (span * idx) / Math.max(1, this.config.choicesPerQuestion - 1)
        );
      }

      if (!alignInfo) {
        // Fallback - trường hợp không có alignment info
        const medianHeight = median(byY.map((b) => b.rect.height));
        const rowTolerance = Math.max(6, medianHeight * 0.8);
        const rows = [];

        byY.forEach((bubble) => {
          const existingRow = rows.find((row) => Math.abs(row.meanY - bubble.centerY) <= rowTolerance);
          if (existingRow) {
            existingRow.items.push(bubble);
            existingRow.meanY = existingRow.items.reduce((s, b) => s + b.centerY, 0) / existingRow.items.length;
          } else {
            rows.push({ meanY: bubble.centerY, items: [bubble] });
          }
        });

        rows.sort((a, b) => a.meanY - b.meanY);
        rows.forEach((row, rowIndex) => {
          const sortedChoices = [...row.items].sort((a, b) => a.centerX - b.centerX).slice(0, this.config.choicesPerQuestion);
          if (sortedChoices.length === this.config.choicesPerQuestion) {
            structured.push({
              columnIndex,
              rowIndex,
              questionNumber: columnIndex * this.config.questionsPerColumn + rowIndex + 1,
              choices: sortedChoices,
            });
          }
        });
        return;
      }

      // *** GHÉP BUBBLE VÀO HÀNG ĐƯỢC PREDEFINE ***
      byY.forEach((bubble) => {
        let bestRowIdx = 0;
        let minYDistance = Number.POSITIVE_INFINITY;

        alignInfo.predefinedRows.forEach((row, idx) => {
          const distance = Math.abs(bubble.centerY - row.yPosition);
          if (distance < minYDistance) {
            minYDistance = distance;
            bestRowIdx = idx;
          }
        });

        const targetRow = alignInfo.predefinedRows[bestRowIdx];
        if (minYDistance <= targetRow.tolerance) {
          targetRow.items.push(bubble);
        }
      });

      // Tạo kết quả cho mỗi hàng
      alignInfo.predefinedRows.forEach((row, rowIndex) => {
        if (row.items.length > 0) {
          const remaining = [...row.items];
          const choices = choiceCenters.map((centerX) => {
            let bestIdx = -1;
            let bestDist = Number.POSITIVE_INFINITY;
            for (let i = 0; i < remaining.length; i += 1) {
              const dist = Math.abs(remaining[i].centerX - centerX);
              if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
              }
            }

            if (bestIdx >= 0 && bestDist <= xTolerance) {
              const [picked] = remaining.splice(bestIdx, 1);
              return picked;
            }

            return {
              contour: null,
              rect: {
                x: Math.round(centerX - medianWidth / 2),
                y: Math.round(row.yPosition - medianHeight / 2),
                width: Math.round(medianWidth),
                height: Math.round(medianHeight),
              },
              centerX,
              centerY: row.yPosition,
              synthetic: true,
            };
          });

          const matchedCount = choices.filter((choice) => choice.contour).length;
          if (matchedCount >= 2) {
            const actualY = row.items.reduce((sum, b) => sum + b.centerY, 0) / row.items.length;
            structured.push({
              columnIndex,
              rowIndex,
              questionNumber: columnIndex * this.config.questionsPerColumn + rowIndex + 1,
              choices,
              matchedChoiceCount: matchedCount,
              predictedY: row.yPosition,
              actualY,
              yOffset: actualY - row.yPosition,
            });

            if (this.config.debug && Math.abs(actualY - row.yPosition) > row.tolerance * 0.5) {
              console.log(
                `[Y-OFFSET WARNING] Q${columnIndex * this.config.questionsPerColumn + rowIndex + 1}: ` +
                `predicted=${Math.round(row.yPosition)}, actual=${Math.round(actualY)}, ` +
                `offset=${Math.round(actualY - row.yPosition)}`
              );
            }
          }
        }
      });
    });

    structured.sort((a, b) => a.questionNumber - b.questionNumber);
    return structured;
  }

  detectAnswers(binaryMat, structuredQuestions, options = {}) {
    const answersMap = {};
    const logs = [];
    let blankCount = 0;
    let invalidCount = 0;

    const getRectDensity = (rect) => {
      if (!rect) return 0;
      const fullX = Math.floor(rect.x);
      const fullY = Math.floor(rect.y);
      const fullW = Math.max(1, Math.floor(rect.width || 1));
      const fullH = Math.max(1, Math.floor(rect.height || 1));

      // Chỉ lấy vùng trung tâm để giảm nhiễu nền và đường kẻ gần mép.
      const x = Math.max(0, Math.floor(fullX + fullW * 0.2));
      const y = Math.max(0, Math.floor(fullY + fullH * 0.2));
      const w = Math.max(1, Math.min(binaryMat.cols - x, Math.floor(fullW * 0.6)));
      const h = Math.max(1, Math.min(binaryMat.rows - y, Math.floor(fullH * 0.6)));
      if (x >= binaryMat.cols || y >= binaryMat.rows || w <= 0 || h <= 0) return 0;

      const roi = binaryMat.roi(new cv.Rect(x, y, w, h));
      try {
        const nonZero = cv.countNonZero(roi);
        return nonZero / Math.max(1, w * h);
      } finally {
        roi.delete();
      }
    };

    const detectedBubbleCount = Number(options.detectedBubbleCount || 0);
    const sparseMode = detectedBubbleCount > 0 && detectedBubbleCount < Math.floor(this.config.expectedQuestions * 2.4);

    const prepared = structuredQuestions.map((question) => {
      const densities = question.choices.map((bubble, idx) => {
        const density = bubble.contour
          ? this.computeContourDensity(binaryMat, bubble.contour, { erode: true })
          : getRectDensity(bubble.rect);

        return {
          choice: CHOICES[idx],
          density,
          bubble,
        };
      });

      return { question, densities };
    });

    const normalizeByChoiceBias = (() => {
      const baselineByColumn = {};
      prepared.forEach(({ question, densities }) => {
        const colKey = String(question.columnIndex);
        if (!baselineByColumn[colKey]) {
          baselineByColumn[colKey] = { A: [], B: [], C: [], D: [] };
        }
        densities.forEach((d) => {
          baselineByColumn[colKey][d.choice].push(d.density);
        });
      });

      const baseline = {};
      Object.entries(baselineByColumn).forEach(([colKey, choiceMap]) => {
        baseline[colKey] = {};
        Object.entries(choiceMap).forEach(([choice, values]) => {
          if (!values.length) {
            baseline[colKey][choice] = 0;
            return;
          }
          const sorted = [...values].sort((a, b) => a - b);
          const qIdx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.45));
          baseline[colKey][choice] = sorted[qIdx] * 0.92;
        });
      });

      return (question, densities) => {
        const colKey = String(question.columnIndex);
        return densities.map((d) => {
          const base = baseline[colKey]?.[d.choice] ?? 0;
          const normalized = Math.max(0, d.density - base);
          return {
            ...d,
            normalized,
            score: normalized * 1.1 + d.density * 0.1,
          };
        });
      };
    })();

    prepared.forEach(({ question, densities }) => {
      const adjustedDensities = normalizeByChoiceBias(question, densities);

      const sortedByScore = [...adjustedDensities].sort((a, b) => b.score - a.score);
      const top = sortedByScore[0];
      const second = sortedByScore[1] || { score: 0, normalized: 0, density: 0 };
      const avgScore = adjustedDensities.reduce((sum, d) => sum + d.score, 0) / Math.max(1, adjustedDensities.length);
      const relativeToAverage = top.score / Math.max(1e-6, avgScore);
      const winnerGap = top.score - second.score;
      const densityValues = adjustedDensities.map((d) => d.density).sort((a, b) => a - b);
      const medianDensity = densityValues[Math.floor(densityValues.length / 2)] || 0;
      const densityLift = top.density - medianDensity;

      let answer = "Blank";
      const strongAbsolute = top.normalized >= (sparseMode ? 0.32 : 0.26) || top.density >= (sparseMode ? 0.60 : 0.50);
      const strongRelative = relativeToAverage >= (sparseMode ? 1.7 : 1.5) && winnerGap >= (sparseMode ? 0.16 : 0.12);
      const mediumRelative = top.normalized >= (sparseMode ? 0.20 : 0.15) && winnerGap >= (sparseMode ? 0.20 : 0.14);
      const enoughLift = densityLift >= (sparseMode ? 0.16 : 0.12);
      const matchedChoiceCount = Number(question.matchedChoiceCount || this.config.choicesPerQuestion);
      const enoughMatchedChoices = sparseMode ? matchedChoiceCount >= 4 : matchedChoiceCount >= 3;

      if (enoughMatchedChoices && enoughLift && (strongAbsolute || strongRelative || mediumRelative)) {
        answer = top.choice;
      } else {
        answer = "Blank";
        blankCount += 1;
      }

      answersMap[String(question.questionNumber)] = answer;

      const logItem = {
        questionNumber: question.questionNumber,
        columnIndex: question.columnIndex,
        rowIndex: question.rowIndex,
        densities: Object.fromEntries(densities.map((d) => [d.choice, Number(d.density.toFixed(4))])),
        normalized: Object.fromEntries(adjustedDensities.map((d) => [d.choice, Number(d.normalized.toFixed(4))])),
        maxVsAverageRatio: Number(relativeToAverage.toFixed(4)),
        winnerGap: Number(winnerGap.toFixed(4)),
        densityLift: Number(densityLift.toFixed(4)),
        matchedChoiceCount,
        sparseMode,
        answer,
      };
      logs.push(logItem);

      if (this.config.debug) {
        let yOffsetLog = "";
        if (question.yOffset !== undefined) {
          yOffsetLog = ` | Y-offset=${Math.round(question.yOffset)}px`;
        }
        console.log(
          `[Q${question.questionNumber}] C${question.columnIndex + 1}R${question.rowIndex + 1}` +
            ` | A:${logItem.densities.A} B:${logItem.densities.B} C:${logItem.densities.C} D:${logItem.densities.D}` +
            ` => ${answer}${yOffsetLog}`
        );
      }
    });

    // Đảm bảo luôn trả đủ số câu theo cấu hình (mặc định 60 câu = 3 cột x 20 hàng).
    for (let q = 1; q <= this.config.expectedQuestions; q += 1) {
      const key = String(q);
      if (!(key in answersMap)) {
        answersMap[key] = "Blank";
        blankCount += 1;
        logs.push({
          questionNumber: q,
          missing: true,
          answer: "Blank",
        });
      }
    }

    return {
      answersMap,
      logs,
      blankCount,
      invalidCount,
    };
  }

  drawDebugOverlay(warpedColor, structuredQuestions, gradingResult) {
    const overlay = warpedColor.clone();

    structuredQuestions.forEach((question) => {
      const answer = gradingResult.answersMap[String(question.questionNumber)];

      question.choices.forEach((bubble, idx) => {
        const choice = CHOICES[idx];

        let color = new cv.Scalar(0, 165, 255, 255);
        if (answer === "Blank") {
          color = new cv.Scalar(0, 255, 255, 255);
        } else if (answer === "Invalid") {
          color = new cv.Scalar(203, 192, 255, 255);
        } else if (answer === choice) {
          color = new cv.Scalar(0, 255, 0, 255);
        }

        const rect = bubble.rect;
        const pt1 = new cv.Point(rect.x, rect.y);
        const pt2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
        cv.rectangle(overlay, pt1, pt2, color, 2);
      });

      const firstBubble = question.choices[0];
      const labelPoint = new cv.Point(firstBubble.rect.x - 30, firstBubble.rect.y + 10);
      cv.putText(
        overlay,
        `${question.questionNumber}:${answer}`,
        labelPoint,
        cv.FONT_HERSHEY_SIMPLEX,
        0.4,
        new cv.Scalar(255, 0, 255, 255),
        1
      );
    });

    return overlay;
  }

  exportWarpedPageForDebug(mat, filename = "warped_page.png") {
    // *** XUẤT WARPED PAGE CHO DEBUG ***
    // Hàm này lưu ảnh warped page dưới dạng canvas để kiểm tra 4 góc
    try {
      const canvas = this.matToCanvas(mat);
      // Trong browser, export canvas sang dataURL hoặc download
      const imageData = canvas.toDataURL("image/png");
      
      // Log để user có thể kiểm tra trong browser console
      if (this.config.debug) {
        console.log(`[DEBUG WARP] Warped page available as data URL. Canvas size: ${canvas.width}x${canvas.height}`);
        console.log(`[DEBUG WARP] Kiểm tra: 4 góc của điểm neo đen phải nằm sát mép (0,0), (${mat.cols-1},0), (${mat.cols-1},${mat.rows-1}), (0,${mat.rows-1})`);
        
        // Nếu có window.OMRDebug, lưu ảnh vào đó
        if (typeof window !== 'undefined') {
          window.OMRDebugWarpedPage = imageData;
          window.OMRDebugWarpedPageSize = { width: canvas.width, height: canvas.height };
        }
      }
      
      return imageData;
    } catch (error) {
      console.error(`[DEBUG WARP ERROR] Không thể xuất warped page: ${error.message}`);
      return null;
    }
  }

  matToCanvas(mat) {
    const canvas = document.createElement("canvas");
    canvas.width = mat.cols;
    canvas.height = mat.rows;
    cv.imshow(canvas, mat);
    return canvas;
  }

  static toCsv(resultMap) {
    return toCsv(resultMap);
  }
}

export default OMRProcessor;
