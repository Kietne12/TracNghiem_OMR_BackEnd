const TEMPLATE_WIDTH = 595.28;
const TEMPLATE_HEIGHT = 841.89;
const TEMPLATE_NUMERIC_ROWS = [130, 150.25, 170.75, 191.25, 211.75, 232.5, 252.75, 273.25, 294, 314.5];
const TEMPLATE_SBD_COLUMNS = [366, 386.75, 407, 427.5, 448.25];
const TEMPLATE_MADE_COLUMNS = [507.25, 527.75, 548];

const scaleBox = (box, scaleX, scaleY) => ({
  left: box.left * scaleX,
  top: box.top * scaleY,
  width: box.width * scaleX,
  height: box.height * scaleY,
});

const scalePoint = (point, scaleX, scaleY) => ({
  x: point.x * scaleX,
  y: point.y * scaleY,
});

const buildDigitGridLayout = ({
  x,
  y,
  boxWidth,
  boxHeight,
  digitColumns,
  bubbleShiftX = 0,
  hasInputFields = false,
  edgeGap = 10.5,
  topPadding = 30,
  inputBoxTopGap = 12,
}) => {
  const bottomPadding = 30;
  const bubbleRadius = 5;
  const centerSpacing = 2 * bubbleRadius + edgeGap;
  const boxSize = 14;
  const rowCount = 10;
  const inputHeight = hasInputFields ? boxSize + inputBoxTopGap : 0;
  const bubbleGridWidth = (digitColumns - 1) * centerSpacing + 2 * bubbleRadius;
  const contentCenterX = x + boxWidth / 2 + bubbleShiftX;
  const firstBubbleCenterX = contentCenterX - bubbleGridWidth / 2;
  const bubbleStartY = y + topPadding + inputHeight;
  const bubbles = [];
  const inputBoxes = [];

  for (let col = 0; col < digitColumns; col += 1) {
    const column = [];
    const centerX = firstBubbleCenterX + col * centerSpacing;

    if (hasInputFields) {
      inputBoxes.push({
        left: centerX - boxSize / 2,
        top: y + topPadding,
        width: boxSize,
        height: boxSize,
      });
    }

    for (let row = 0; row < rowCount; row += 1) {
      column.push({
        x: centerX,
        y: bubbleStartY + row * centerSpacing,
        radius: bubbleRadius,
        digit: row,
      });
    }

    bubbles.push(column);
  }

  return {
    box: { left: x, top: y, width: boxWidth, height: boxHeight },
    bubbles,
    inputBoxes,
    bubbleRadius,
    rowCount,
    digitColumns,
  };
};

const buildDigitGridFromTemplate = ({
  xPositions,
  rowPositions,
  radius,
  box,
  scaleX,
  scaleY,
}) => ({
  box,
  bubbles: xPositions.map((templateX) =>
    rowPositions.map((templateY, digit) => ({
      x: templateX * scaleX,
      y: templateY * scaleY,
      radius: radius * Math.min(scaleX, scaleY),
      digit,
    }))
  ),
  inputBoxes: [],
  bubbleRadius: radius * Math.min(scaleX, scaleY),
  rowCount: rowPositions.length,
  digitColumns: xPositions.length,
});

export const getOmrLayout = ({
  pageWidth = TEMPLATE_WIDTH,
  pageHeight = TEMPLATE_HEIGHT,
} = {}) => {
  const scaleX = pageWidth / TEMPLATE_WIDTH;
  const scaleY = pageHeight / TEMPLATE_HEIGHT;
  const scale = Math.min(scaleX, scaleY);

  const margins = {
    left: 24 * scaleX,
    right: 24 * scaleX,
    top: 24 * scaleY,
    bottom: 24 * scaleY,
  };

  const left = margins.left;
  const right = pageWidth - margins.right;
  const width = right - left;

  const infoTop = 74 * scaleY;
  const leftInfoWidth = width * 0.56;
  const rightInfoX = left + leftInfoWidth + 10 * scaleX;
  const rightInfoWidth = width - leftInfoWidth - 10 * scaleX;
  const rightInnerGap = 10 * scaleX;
  const infoBoxHeight = 250 * scaleY;
  const sbdBoxWidth = (rightInfoWidth - rightInnerGap) * 0.65;
  const maDeBoxWidth = rightInfoWidth - rightInnerGap - sbdBoxWidth;

  const sbdBox = { left: rightInfoX, top: infoTop, width: sbdBoxWidth, height: infoBoxHeight };
  const maDeBox = {
    left: rightInfoX + sbdBoxWidth + rightInnerGap,
    top: infoTop,
    width: maDeBoxWidth,
    height: infoBoxHeight,
  };

  const sbd = buildDigitGridFromTemplate({
    xPositions: TEMPLATE_SBD_COLUMNS,
    rowPositions: TEMPLATE_NUMERIC_ROWS,
    radius: 5,
    box: sbdBox,
    scaleX,
    scaleY,
  });

  const maDe = buildDigitGridFromTemplate({
    xPositions: TEMPLATE_MADE_COLUMNS,
    rowPositions: TEMPLATE_NUMERIC_ROWS,
    radius: 5,
    box: maDeBox,
    scaleX,
    scaleY,
  });

  const answerPadding = 10 * scaleX;
  const answerLeft = left + answerPadding;
  const answerRight = right - answerPadding;
  const availableWidth = answerRight - answerLeft;
  const columnCount = 3;
  const columnGap = 10 * scaleX;
  const columnWidth = (availableWidth - columnGap * (columnCount - 1)) / columnCount;
  const rowsPerColumn = 20;
  const headerHeight = 26 * scaleY;
  const bubbleRadius = 5 * scale;
  const answerEdgeGap = 5 * scale;
  const rowHeight = answerEdgeGap + 2 * bubbleRadius;
  const numberColumnWidth = 25 * scaleX;
  const numberBubbleGap = 10 * scaleX;
  const bubblesAreaPadding = 6 * scaleX;
  const bubblesAreaStartX = numberColumnWidth + numberBubbleGap + bubblesAreaPadding;
  const availableForBubbles =
    columnWidth - numberColumnWidth - numberBubbleGap - 2 * bubblesAreaPadding;
  const bubbleSpacing = (availableForBubbles - 2 * bubbleRadius) / 3;
  const answersStartY = infoTop + infoBoxHeight + 26 * scaleY;
  const answerBoxHeight = headerHeight + rowsPerColumn * rowHeight + 10 * scaleY;

  const answerColumns = [];
  const questions = [];

  for (let col = 0; col < columnCount; col += 1) {
    const colX = answerLeft + col * (columnWidth + columnGap);
    const firstBubbleX = colX + bubblesAreaStartX + bubbleRadius;

    answerColumns.push({
      box: {
        left: colX,
        top: answersStartY,
        width: columnWidth,
        height: answerBoxHeight,
      },
      firstBubbleX,
    });

    for (let row = 0; row < rowsPerColumn; row += 1) {
      const questionNumber = col * rowsPerColumn + row + 1;
      const centerY = answersStartY + headerHeight + bubbleRadius + row * rowHeight;
      const bubbles = ["A", "B", "C", "D"].map((choice, choiceIdx) => ({
        choice,
        x: firstBubbleX + choiceIdx * bubbleSpacing,
        y: centerY,
        radius: bubbleRadius,
      }));

      questions.push({
        number: questionNumber,
        column: col,
        row,
        bubbles,
      });
    }
  }

  const regionAnchorSize = 10 * scale;
  const alignmentMarkerSize = 12 * scale;

  return {
    pageWidth,
    pageHeight,
    scaleX,
    scaleY,
    scale,
    margins,
    alignmentMarkerSize,
    regionAnchorSize,
    leftInfoBox: {
      left,
      top: infoTop,
      width: leftInfoWidth,
      height: infoBoxHeight,
    },
    sbd,
    maDe,
    answers: {
      outerBox: {
        left: answerLeft,
        top: answersStartY,
        width: availableWidth,
        height: answerBoxHeight,
      },
      columns: answerColumns,
      questions,
      bubbleRadius,
      rowsPerColumn,
      columnCount,
    },
    pageAnchors: [
      { x: margins.left, y: margins.top },
      { x: pageWidth - margins.right, y: margins.top },
      { x: margins.left, y: pageHeight - margins.bottom },
      { x: pageWidth - margins.right, y: pageHeight - margins.bottom },
    ],
  };
};

export const getRegionAnchors = (box, anchorSize = 10) => [
  { x: box.left, y: box.top, size: anchorSize },
  { x: box.left + box.width, y: box.top, size: anchorSize },
  { x: box.left, y: box.top + box.height, size: anchorSize },
  { x: box.left + box.width, y: box.top + box.height, size: anchorSize },
];

export const toLocalBox = (outerBox, box) => ({
  left: Math.round(box.left - outerBox.left),
  top: Math.round(box.top - outerBox.top),
  width: Math.round(box.width),
  height: Math.round(box.height),
});

export const toLocalPoint = (outerBox, point) => ({
  x: point.x - outerBox.left,
  y: point.y - outerBox.top,
});

export const scaleLayoutBox = scaleBox;
export const scaleLayoutPoint = scalePoint;
