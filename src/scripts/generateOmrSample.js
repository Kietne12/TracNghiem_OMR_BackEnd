import fs from "fs";
import path from "path";
import sharp from "sharp";
import { getOmrLayout } from "../utils/omrLayout.js";

const OUTPUT_DIR = path.resolve("samples", "generated");
const PAGE_SCALE = 4;
const PAGE_WIDTH = 595.28 * PAGE_SCALE;
const PAGE_HEIGHT = 841.89 * PAGE_SCALE;
const DEFAULT_BASE_PDF = "C:\\Users\\KAI\\Downloads\\phieu-omr-23 (1).pdf";
const TEMPLATE_NUMERIC_BUBBLES = {
  sbdX: [1464, 1547, 1629, 1710, 1793],
  maDeX: [2028, 2111, 2192],
  rowY: [519, 601, 684, 765, 847, 930, 1011, 1093, 1176, 1258],
  radius: 15,
};

const DEFAULT_SAMPLE = {
  mssv: "00001",
  maDe: "001",
  answers: ["A", "B", "C", "D", "A", ...Array(55).fill(null)],
};

const args = process.argv.slice(2);
const outputName = args[0] || "omr_sample_filled.png";
const mode = (args[1] || "filled").toLowerCase();
const basePdfPath = args[2] || DEFAULT_BASE_PDF;

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const drawAnchor = (x, y, size) =>
  `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" fill="#000" />`;

const drawCircle = (x, y, radius, fill = "none", stroke = "#111", strokeWidth = 2) =>
  `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;

const drawText = (x, y, text, options = {}) => {
  const {
    size = 14,
    anchor = "start",
    weight = 400,
    fill = "#111",
    family = "Arial, Helvetica, sans-serif",
  } = options;

  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" font-weight="${weight}" fill="${fill}" font-family="${family}">${escapeXml(
    text
  )}</text>`;
};

const buildOverlaySvg = ({ mssv, maDe, answers, filled }) => {
  const layout = getOmrLayout({
    pageWidth: PAGE_WIDTH,
    pageHeight: PAGE_HEIGHT,
  });

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}">`,
    `<rect width="100%" height="100%" fill="transparent" />`,
  ];

  const fillBubble = (bubble, scale = 0.72) => {
    parts.push(drawCircle(bubble.x, bubble.y, bubble.radius * scale, "#111", "none", 0));
  };

  const fillNumericBubble = (xList, value) => {
    xList.forEach((x, columnIndex) => {
      const digit = Number(String(value[columnIndex] || "0"));
      const y = TEMPLATE_NUMERIC_BUBBLES.rowY[digit];
      if (!filled || Number.isNaN(digit) || !y) return;
      parts.push(
        drawCircle(
          x,
          y,
          TEMPLATE_NUMERIC_BUBBLES.radius,
          "#111",
          "none",
          0
        )
      );
    });
  };

  fillNumericBubble(TEMPLATE_NUMERIC_BUBBLES.sbdX, mssv);
  fillNumericBubble(TEMPLATE_NUMERIC_BUBBLES.maDeX, maDe);

  layout.answers.questions.forEach((question) => {
    const selected = answers[question.number - 1] || null;
    question.bubbles.forEach((bubble) => {
      if (filled && selected === bubble.choice) {
        fillBubble(bubble, 0.7);
      }
    });
  });

  parts.push("</svg>");
  return parts.join("");
};

const buildSvg = ({ mssv, maDe, answers, filled }) => {
  const layout = getOmrLayout({
    pageWidth: PAGE_WIDTH,
    pageHeight: PAGE_HEIGHT,
  });

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}">`,
    `<rect width="100%" height="100%" fill="#fff" />`,
  ];

  for (const marker of layout.pageAnchors) {
    parts.push(drawAnchor(marker.x, marker.y, layout.alignmentMarkerSize));
  }

  parts.push(
    drawText(PAGE_WIDTH / 2, 120, "PHIEU TRA LOI TRAC NGHIEM", {
      size: 28,
      anchor: "middle",
      weight: 700,
    })
  );
  parts.push(drawText(layout.margins.left, 170, "Ky thi: Demo OMR", { size: 16 }));
  parts.push(drawText(layout.margins.left + 310, 170, "Ngay thi: 21/04/2026", { size: 16 }));

  const info = layout.leftInfoBox;
  parts.push(
    `<rect x="${info.left}" y="${info.top}" width="${info.width}" height="${info.height}" fill="none" stroke="#111" stroke-width="2" />`
  );

  const infoLines = [
    ["Ho ten thi sinh", info.top + 30],
    ["MSSV", info.top + 80],
    ["Lop", info.top + 130],
    ["Phong thi", info.top + 180],
    ["Chu ky thi sinh", info.top + 230],
  ];

  for (const [label, y] of infoLines) {
    parts.push(drawText(info.left + 18, y, `${label}:`, { size: 15 }));
    parts.push(
      `<line x1="${info.left + 160}" y1="${y + 6}" x2="${info.left + info.width - 20}" y2="${y + 6}" stroke="#555" stroke-dasharray="4 4" />`
    );
  }

  const drawDigitSection = (section, title, value) => {
    parts.push(
      `<rect x="${section.box.left}" y="${section.box.top}" width="${section.box.width}" height="${section.box.height}" fill="none" stroke="#111" stroke-width="2" />`
    );

    const anchorSize = layout.regionAnchorSize;
    const corners = [
      [section.box.left, section.box.top],
      [section.box.left + section.box.width, section.box.top],
      [section.box.left, section.box.top + section.box.height],
      [section.box.left + section.box.width, section.box.top + section.box.height],
    ];

    for (const [x, y] of corners) {
      parts.push(drawAnchor(x, y, anchorSize));
    }

    parts.push(
      drawText(section.box.left + section.box.width / 2, section.box.top + 24, title, {
        size: 16,
        anchor: "middle",
        weight: 600,
      })
    );

    section.inputBoxes.forEach((box) => {
      parts.push(
        `<rect x="${box.left}" y="${box.top}" width="${box.width}" height="${box.height}" fill="none" stroke="#222" stroke-width="1.5" />`
      );
    });

    section.bubbles.forEach((column, columnIndex) => {
      column.forEach((bubble) => {
        const isFilled = filled && String(value[columnIndex] || "0") === String(bubble.digit);
        parts.push(drawCircle(bubble.x, bubble.y, bubble.radius, isFilled ? "#111" : "none"));
        parts.push(
          drawText(bubble.x, bubble.y + bubble.radius + 15, String(bubble.digit), {
            size: 12,
            anchor: "middle",
          })
        );
      });
    });
  };

  drawDigitSection(layout.sbd, "So bao danh", mssv);
  drawDigitSection(layout.maDe, "Ma de thi", maDe);

  parts.push(
    drawText(PAGE_WIDTH / 2, layout.sbd.box.top + layout.sbd.box.height + 38, "To dam 1 o cho moi lua chon.", {
      size: 14,
      anchor: "middle",
    })
  );

  const answersBox = layout.answers.outerBox;
  parts.push(
    `<rect x="${answersBox.left}" y="${answersBox.top}" width="${answersBox.width}" height="${answersBox.height}" fill="none" stroke="none" />`
  );

  const answerCorners = [
    [answersBox.left, answersBox.top],
    [answersBox.left + answersBox.width, answersBox.top],
    [answersBox.left, answersBox.top + answersBox.height],
    [answersBox.left + answersBox.width, answersBox.top + answersBox.height],
  ];

  for (const [x, y] of answerCorners) {
    parts.push(drawAnchor(x, y, layout.regionAnchorSize));
  }

  layout.answers.columns.forEach((column, index) => {
    parts.push(
      `<rect x="${column.box.left}" y="${column.box.top}" width="${column.box.width}" height="${column.box.height}" fill="none" stroke="#111" stroke-width="2" />`
    );

    const headerQuestion = layout.answers.questions.find((item) => item.column === index && item.row === 0);
    if (headerQuestion) {
      headerQuestion.bubbles.forEach((bubble, bubbleIndex) => {
        parts.push(
          drawText(bubble.x, column.box.top + 22, ANSWER_LABELS[bubbleIndex], {
            size: 16,
            anchor: "middle",
            weight: 700,
          })
        );
      });
    }
  });

  layout.answers.questions.forEach((question) => {
    const selected = answers[question.number - 1] || null;
    const firstBubble = question.bubbles[0];
    parts.push(
      drawText(firstBubble.x - 52, firstBubble.y + 5, String(question.number), {
        size: 14,
        anchor: "end",
      })
    );

    question.bubbles.forEach((bubble) => {
      const isFilled = filled && selected === bubble.choice;
      parts.push(drawCircle(bubble.x, bubble.y, bubble.radius, isFilled ? "#111" : "none"));
    });
  });

  parts.push("</svg>");
  return parts.join("");
};

const ANSWER_LABELS = ["A", "B", "C", "D"];

const outputPath = path.resolve(OUTPUT_DIR, outputName);
const extension = path.extname(outputPath).toLowerCase();
const useFilled = mode !== "blank";
const svg = buildSvg({
  ...DEFAULT_SAMPLE,
  filled: useFilled,
});
const overlaySvg = buildOverlaySvg({
  ...DEFAULT_SAMPLE,
  filled: useFilled,
});

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const hasBaseTemplate = fs.existsSync(basePdfPath);

let pipeline = hasBaseTemplate
  ? sharp(basePdfPath).resize(Math.round(PAGE_WIDTH), Math.round(PAGE_HEIGHT))
  : sharp(Buffer.from(svg));

if (hasBaseTemplate) {
  pipeline = pipeline.composite([
    {
      input: Buffer.from(overlaySvg),
      top: 0,
      left: 0,
    },
  ]);
}

if (extension === ".jpg" || extension === ".jpeg") {
  await pipeline.jpeg({ quality: 95 }).toFile(outputPath);
} else {
  await pipeline.png().toFile(outputPath);
}

console.log(`Created ${outputPath}`);
console.log(`Mode: ${useFilled ? "filled" : "blank"}`);
console.log(`Base template: ${hasBaseTemplate ? basePdfPath : "internal SVG template"}`);
console.log(`MSSV: ${DEFAULT_SAMPLE.mssv}`);
console.log(`Ma de: ${DEFAULT_SAMPLE.maDe}`);
