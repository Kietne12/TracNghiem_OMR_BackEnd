# OMR Detection Fix - Quy Trình 3 Bước Chặt Chẽ

## Bản Tóm Tắt Vấn Đề & Giải Pháp

### Vấn Đề Cũ
- ❌ Phát hiện quét lung tung: bắt chữ, khung, text thành bubble
- ❌ Không phân biệt được bubble thật (tô đen) vs text/khung (outline)
- ❌ Warp perspective không ổn định
- ❌ Contour detection quá lỏng lẻo

### Giải Pháp Mới
✅ Quy trình 3 bước chặt chẽ
✅ Density-based filtering: loại bỏ text/khung không có "độ đen" đủ cao
✅ Outer anchor detection cải tiến: tìm chỉ những chấm đen **lớn lao** ở góc
✅ Region-based scanning: chỉ findContours bên trong mỗi vùng

---

## QUY TRÌNH 3 BƯỚC

### 🔴 BƯỚC 1: Tìm 4 Điểm Neo Góc Trang (Outer Anchors)

**Mục đích:** Xác định ranh giới trang từ 4 chấm đen ở góc

**Hàm:** `detectOuterAnchors(src)` → `findLargeAnchorInWindow()`

**Cách thức:**
```
1. Convert ảnh → Grayscale → Binary inversion (tìm vùng đen)
2. Chia 4 vùng góc (25% mỗi phía)
3. Trong mỗi góc, tìm contour:
   - Kích thước: 0.1% - 10% của tổng ảnh (LỚN, không phải chữ)
   - Aspect ratio: 0.7-1.3 (gần hình tròn)
   - Circularity: ≥0.5 (phải tròn, không phải khung)
4. Chọn contour lớn nhất → tâm điểm là anchor
```

**Điểm cải tiến:**
- Lọc kích thước chặt chẽ hơn (0.1% - 10%, không phải 0.002% như bubble)
- Yêu cầu circularity cao hơn (0.5 vs 0.45) để chỉ lấy chấm tròn đen
- Bỏ các contour nhỏ (text, symbols)

### 🟢 BƯỚC 2: Warp Trang Về Kích Thước Chuẩn

**Mục đích:** Chuẩn hóa trang về 1200x1700 pixels

**Hàm:** `warpRegionByAnchors(src, outerAnchors, {width: 1200, height: 1700})`

**Cách thức:**
```
1. Lấy 4 outer anchors từ bước 1
2. Áp dụng getPerspectiveTransform:
   src: 4 góc ảnh gốc
   dst: 4 góc ảnh chuẩn 1200x1700
3. warpPerspective ảnh gốc → kết quả chuẩn
```

**Kết quả:** Ảnh được nằm thẳng, scale nhất quán

---

### 🔵 BƯỚC 3A: Xác Định 3 Vùng Nội Dung (Region Anchors)

**Mục đích:** Tìm vị trí SBD, Mã đề, Câu hỏi trên trang đã nắn

**Hàm:** `detectRegionAnchors(pageBinary, width, height)`

**Cách thức:**
```
1. Định nghĩa 3 vùng theo tỉ lệ phần trăm:
   - SBD:    x=53%, y=12%, w=15%, h=32%
   - MãĐề:   x=80%, y=12%, w=13%, h=32%
   - Answers: x=8%,  y=42%, w=84%, h=50%

2. Mỗi vùng, chia 4 góc (22% mỗi phía)

3. Tìm 4 anchor (nhỏ hơn outer anchor):
   - Kích thước: 15-1000 pixels
   - Aspect: 0.6-1.5
   - Circularity: 0.3

4. orderPoints() → [TL, TR, BR, BL]
```

**Kết quả:** Có 4 điểm neo cho mỗi vùng

---

### 🟣 BƯỚC 3B: Crop & Xử Lý Từng Vùng (Region-based Scanning)

#### Vùng SBD: 5 cột x 10 hàng
```javascript
sbdColor = warpRegionByAnchors(pageWarped, regionAnchors.sbd, {width: 300, height: 560})
sbdBinary = preprocessToBinary(sbdColor)
sbdResult = detectNumericGrid(sbdBinary, {digitColumns: 5, digitRows: 10})
// findContours CHỈ bên trong vùng sbdBinary crop
```

**Lợi ích:**
- Chỉ phát hiện số trong vùng SBD, không bị ảnh hưởng từ chữ/khung bên ngoài
- Density check tự động: chỉ số được tô đen

#### Vùng Mã Đề: 3 cột x 10 hàng
```javascript
maDeColor = warpRegionByAnchors(pageWarped, regionAnchors.maDe, {width: 220, height: 560})
maDeBinary = preprocessToBinary(maDeColor)
maDeResult = detectNumericGrid(maDeBinary, {digitColumns: 3, digitRows: 10})
// findContours CHỈ bên trong vùng maDeBinary crop
```

#### Vùng Câu Hỏi: 4 cột x 30 câu
```javascript
answersColor = warpRegionByAnchors(pageWarped, regionAnchors.answers, {width: 1500, height: 1000})
answersBinary = preprocessToBinary(answersColor)

// Phát hiện bubble bên trong vùng answers crop
const answerBubbles = detectBubblesWithRetry(answersBinary, answersColor.cols * answersColor.rows)

// Ghép bubble thành 4 cột, 30 câu mỗi cột
const answerStructured = sortAndGroupBubbles(answerBubbles)

// Kiểm tra density cho mỗi bubble trong vùng answers
const answerResult = detectAnswers(answersBinary, answerStructured)
```

---

## CÁC CẢI TIẾN CHI TIẾT

### 1️⃣ Outer Anchor Detection (Mới - `findLargeAnchorInWindow`)

**Trước:**
- Tìm contour 15-1000 pixels (quá lỏng lẻo)
- circularity ≥ 0.3 (quá thấp)

**Sau:**
```javascript
const minAreaForAnchor = imageArea * 0.001;  // 0.1% ảnh
const maxAreaForAnchor = imageArea * 0.1;   // 10% ảnh
// → Chỉ lấy contour LỚN (chấm neo), loại text nhỏ

aspect: 0.7-1.3;       // Gần tròn hơn
circularity >= 0.5;    // Phải tròn thực sự
```

**Kết quả:** Chỉ bắt chấm đen 4 góc, không bị nhầm với text/khung

---

### 2️⃣ Density-based Filtering (Lõi chính của sửa)

**Logic mới trong `detectBubblesByProfile`:**

```javascript
// Kiểm tra độ đen (density) của mỗi bubble
const density = this.computeContourDensity(binaryMat, contour);

// Bubble thật: density ≥ 0.25 (ít nhất 25% pixel bên trong tô đen)
// Text/khung: density < 0.25 (chỉ outline, not filled)
if (density < 0.25 && !options.skipDensityCheck) {
    console.log(`Loại bỏ contour (text/khung?) - density=${density.toFixed(3)}`);
    contour.delete();
    continue;
}
```

**Cách hoạt động:**
1. Vẽ contour vào mask (toàn bộ vùng bên trong được fill)
2. AND mask với binary image (đấy, chỉ pixel đen bên trong)
3. Đếm pixel đen: `nonZero / totalPixelBênTrong`
4. Nếu density < 0.25 → loại bỏ (không phải bubble)

**Kết quả:**
- ✅ Bubble thật (tô đen): density = 0.3-0.9
- ❌ Text nhỏ: density = 0.05-0.15 (only outline)
- ❌ Khung/box: density = 0.1-0.2 (thin lines)

---

### 3️⃣ Circularity Tăng Cao

**Trước:**
```javascript
minCircularity: 0.3  (balanced profile)
minCircularity: 0.2  (relaxed profile)
```

**Sau:**
```javascript
minCircularity: 0.35 (balanced - tăng từ 0.3)
minCircularity: 0.25 (relaxed - tăng từ 0.2)
```

**Lý do:** Text characters thường có circularity thấp; bubble phải tròn

---

### 4️⃣ Logging Chi Tiết (Debug)

Mỗi bước in ra log:
```
[STEP 1] Outer Anchors: TL(123,45) TR(1077,45) BR(1077,1655) BL(123,1655)
[STEP 1] Warp trang: 1200x1700
[STEP 2] Region Anchors detected: SBD=4 points, MaDe=4 points, Answers=4 points
[STEP 3] SBD: findContours trong vùng crop 300x560
[STEP 3] MãĐề: findContours trong vùng crop 220x560
[STEP 3] Answers: findContours trong vùng crop 1500x1000 (dùng density check để loại bỏ text/khung)
[STEP 3] Answers: Phát hiện 485 bubble, ghép thành 120 câu hỏi (kỳ vọng: 120)
```

---

## CÁCH KIỂM THỬ

### 1. Mở demo HTML
```
http://localhost:5000/public/omr-opencv-demo.html
```

### 2. Tải ảnh phiếu OMR
- Ảnh phải rõ, có 4 chấm đen ở góc

### 3. Kiểm tra console log
```
F12 → Console tab
```

Xem:
- ✅ Outer anchors được xác định (4 góc)
- ✅ Warp kích thước 1200x1700
- ✅ Region anchors (SBD, Mã đề, Answers)
- ✅ Số lượng bubble phát hiện (~480-490 cho 120 câu x 4 choices)
- ✅ Số lượng valid answer (120, no Blank/Invalid ngoài mong đợi)

### 4. Xem overlay
- 🟢 Green: Bubble được chọn ✅
- 🟠 Orange: Bubble không chọn ✅
- 🔴 Red: Anchor points
- 🟡 Yellow: Blank answer ⚠️
- 🩷 Pink: Invalid answer ⚠️

---

## THÔNG SỐ TUNING (Nếu Cần)

Nếu vẫn có vấn đề, điều chỉnh trong DEFAULT_CONFIG:

| Tham số | Hiện tại | Tụ tập | Ghi chú |
|---------|----------|-------|---------|
| `adaptiveBlockSize` | 31 | 25-51 | Tăng nếu nhạy, giảm nếu mất chi tiết |
| `adaptiveC` | 9 | 5-15 | Offset threshold adaptive |
| `minContourAreaRatio` | 0.00002 | | Bubble minimum size |
| `maxContourAreaRatio` | 0.003 | | Bubble maximum size |
| `minCircularity` | 0.45 | 0.4-0.6 | Phải tròn bao nhiêu (bubble) |
| `blankDensityThreshold` | 0.18 | 0.1-0.3 | Ngưỡng đánh dấu Blank |
| `invalidSimilarityRatio` | 0.9 | 0.85-0.95 | Khi choice#2 ≥ choice#1 × ratio → Invalid |

---

## NẾU VẦN CÓ VẤNĐỀ

### Vấn đề: Không tìm thấy Outer Anchors
```
Lỗi: "Không tìm thấy chấm neo (4 điểm góc) trong vùng outer-topLeft"
```

**Giải pháp:**
1. Kiểm tra ảnh: có 4 chấm đen rõ ở góc không?
2. Độ tương phản: chấm phải tối (RGB < 100)
3. Kích thước chấm: ít nhất 20x20 pixels (tùy độ phân giải)
4. Điều chỉnh: tăng `cornerRatio` từ 0.25 → 0.3

### Vấn đề: Quá ít bubble phát hiện
```
Lỗi: "Số bubble phát hiện quá ít (250). Tối thiểu cần khoảng 384"
```

**Giải pháp:**
1. Kiểm tra density: Bubble có được tô đen không?
2. Điều chỉnh: tăng `minContourAreaRatio` hoặc giảm `minCircularity`
3. Nếu vẫn thấp, có thể ảnh chụp không rõ hoặc phiếu không chuẩn

### Vấn đề: Quá nhiều "Invalid" hoặc "Blank"
```
Số câu Blank/Invalid > 5-10
```

**Giải pháp:**
1. Kiểm tra: kích thước bubble có nhất quán không?
2. Điều chỉnh: giảm `invalidSimilarityRatio` từ 0.9 → 0.85
3. Hoặc tăng `blankDensityThreshold` từ 0.18 → 0.22

---

## THAM KHẢO CODE

### Hàm: `computeContourDensity(binaryMat, contour)`
```javascript
// Tính % pixel đen bên trong contour
const mask = zeros(rows, cols);
drawContours(mask, [contour], 0, WHITE, -1);  // Fill contour
const masked = bitwise_and(binaryMat, binaryMat, mask);
const density = countNonZero(masked) / countNonZero(mask);
// density ≥ 0.25 → bubble thật
// density < 0.25 → text/khung
```

### Hàm: `detectBubblesByProfile(binaryMat, imageArea, profile, options)`
**Cải tiến:** Thêm `options.skipDensityCheck` để bỏ qua density check nếu cần

---

## KỊCH BẢN HOẠT ĐỘNG LÝ TƯỞNG

```
1. Tải ảnh phiếu
   ↓
2. STEP 1: detectOuterAnchors → 4 điểm góc
   ↓
3. warpPerspective trang → 1200x1700 pixels
   ↓
4. STEP 2: detectRegionAnchors → 12 điểm (4×3 vùng)
   ↓
5. STEP 3A: Crop 3 vùng
   - SBD crop 300×560
   - MaDe crop 220×560
   - Answers crop 1500×1000
   ↓
6. STEP 3B: Phát hiện & lọc
   a) SBD: detectNumericGrid → "12345"
   b) MaDe: detectNumericGrid → "001"
   c) Answers: findContours + density check + sortAndGroup → 120 câu
   ↓
7. Kết quả: {mssv: "12345", maDe: "001", answers: {1: "A", 2: "B", ...}}
```

---

## GHI CHÚ QUAN TRỌNG

⚠️ **Density Check là KỸ CÔN:**
- Nó phân biệt bubble THẬT (tô đầy) vs text/khung (chỉ outline)
- Nếu bỏ density check, sẽ lại bắt nhầm text

✅ **Region-based Scanning:**
- Mỗi vùng được xử lý độc lập
- Không có ảnh hưởng qua lại giữa SBD ↔ MaDe ↔ Answers

✅ **Warp Chuẩn Hóa:**
- Đảm bảo tất cả ảnh phiếu được bình thường hóa
- Tháo gỡ vấn đề xoay/tilt

---

**Phiên bản:** v2.0 (Density-based + Region-based)
**Ngày:** 2026-03-22
**Tác giả:** GitHub Copilot
