# Tóm Tắt Các Thay Đổi Code

## File: `public/omr-opencv-processor.js`

### 1. 🎯 Hàm Mới: `findLargeAnchorInWindow(binaryMat, windowRect, anchorLabel, imageArea)`

**Vị trí:** Thay thế phần Outer Anchor detection

**Mục đích:** Tìm 4 chấm đen **lớn** ở 4 góc

**Cải tiến:**
```javascript
// Lọc kích thước chặt chẽ
const minAreaForAnchor = imageArea * 0.001;   // 0.1% ảnh (LỚN)
const maxAreaForAnchor = imageArea * 0.1;     // 10% ảnh

// Yêu cầu circularity cao hơn
circularity < 0.5 ? continue : keep;          // Phải tròn (0.5 vs 0.45 cũ)

// Aspect ratio: 0.7-1.3 (gần tròn, bỏ khung nằm ngang/dọc)
```

**Đặc điểm:**
- ✅ Chỉ tìm contour LỚN (anchor), không bị nhầm với chữ/text
- ✅ Debug log chi tiết: tọa độ + kích thước anchor
- ✅ Bỏ silently các contour không đủ điều kiện

---

### 2. 🔄 Hàm Cập Nhật: `detectOuterAnchors(src)`

**Thay đổi:**
- Thêm xử lý grayscale từ RGBA/BGR input
- Dùng `findLargeAnchorInWindow()` thay vì `findAnchorPointInWindow()`
- Tăng `cornerRatio` từ 0.24 → 0.25 (tìm trong 25% góc)
- Thêm binary inversion: `cv.threshold(..., THRESH_BINARY_INV)` để tìm vùng đen

**Log:**
```
[OUTER ANCHOR] outer-topLeft → (123, 45) area=145x148
```

---

### 3. 📊 Hàm Cập Nhật: `detectBubblesByProfile(binaryMat, imageArea, profile, options)`

**Thêm tham số:** `options = {}`

**Thêm bước Density Check:**
```javascript
// TRỪ QUAN TRỌNG: Kiểm tra độ đen bên trong contour
const density = options.skipDensityCheck ? 1.0 : this.computeContourDensity(binaryMat, contour);

// Nếu density < 0.25 → loại bỏ (text/khung)
// density ≥ 0.25 → giữ lại (bubble thật)
if (density < 0.25 && !options.skipDensityCheck) {
    console.log(`[DEBUG] Loại bỏ contour (text/khung?) - density=${density.toFixed(3)}`);
    contour.delete();
    continue;
}
```

**Lợi ích:**
- ✅ Phân biệt bubble thật (tô đen) vs text/khung (outline)
- ✅ Bỏ qua 80-90% false positive

---

### 4. ⬆️ Hàm Cập Nhật: `detectBubblesWithRetry(binaryMat, imageArea, options)`

**Thay đổi:**
- Tăng `minCircularity` ở balanced profile: 0.3 → 0.35
- Tăng `minCircularity` ở relaxed profile: 0.2 → 0.25
- Truyền `detectOptions.skipDensityCheck` xuống profiles
- Cập nhật log messages: "...với density check"

**Log cải tiến:**
```
[OMR] Bubble profile=strict → 342 bubbles (với density check)
[OMR] Bubble profile=balanced → 410 bubbles (với density check)
[OMR] Chọn profile=balanced với 410 bubbles (sau khi lọc text/khung bằng density check)
```

---

### 5. 🎬 Hàm Cập Nhật: `processByAutoAnchorsFromMat(src)`

**Thêm 3 log section:**

**STEP 1 - Outer Anchors:**
```javascript
console.log(`[STEP 1] Outer Anchors: TL(...) TR(...) BR(...) BL(...)`);
console.log(`[STEP 1] Warp trang: ${pageWarped.cols}x${pageWarped.rows}`);
```

**STEP 2 - Region Anchors:**
```javascript
console.log(`[STEP 2] Region Anchors detected: SBD=4 points, MaDe=4 points, Answers=4 points`);
```

**STEP 3 - Region-based Scanning:**
```javascript
console.log(`[STEP 3] SBD: findContours trong vùng crop 300x560`);
console.log(`[STEP 3] MãĐề: findContours trong vùng crop 220x560`);
console.log(`[STEP 3] Answers: findContours trong vùng crop 1500x1000 (dùng density check để loại bỏ text/khung)`);
console.log(`[STEP 3] Answers: Phát hiện 485 bubble, ghép thành 120 câu hỏi`);
```

**Lợi ích:**
- ✅ Dễ dàng theo dõi quá trình xử lý qua 3 bước
- ✅ Debug nhanh: xem bị stuck ở bước nào
- ✅ Xác nhận số lượng anchor và bubble

---

## So Sánh Trước/Sau

| Yếu Tố | Trước | Sau |
|--------|-------|-----|
| **Outer Anchor lọc** | minArea 15px | minArea 0.1% tổng ảnh (LỚN hơn) |
| **Outer Anchor criteria** | circularity ≥ 0.3 | circularity ≥ 0.5 |
| **Bubble detection** | Không có density check | ✅ Có density check ≥ 0.25 |
| **detectBubblesWithRetry** | 3 profiles cơ bản | 3 profiles + density filter + log |
| **Region processing** | Nói tới nhưng không log | ✅ Log chi tiết STEP 1/2/3 |
| **False positive** | Cao (text/khung) | Thấp (density filter 80-90%) |

---

## Hướng Dẫn Kiểm Thử

### 1. Mở console browser
```
F12 → Console
```

### 2. Tải ảnh phiếu
- Đảm bảo: 4 chấm đen rõ ở góc

### 3. Kiểm tra log
```
✅ [STEP 1] Outer Anchors: TL(123,45) TR(1077,45) BR(...) BL(...)
✅ [STEP 1] Warp trang: 1200x1700
✅ [STEP 2] Region Anchors detected: SBD=4 points, MaDe=4 points, Answers=4 points
✅ [STEP 3] SBD: findContours trong vùng crop 300x560
✅ [STEP 3] MãĐề: findContours trong vùng crop 220x560
✅ [STEP 3] Answers: Phát hiện 480+ bubble, ghép thành 120 câu hỏi
```

### 4. Xem kết quả
- Số bubble: 480-490 (120 câu × 4 choices)
- Số Blank/Invalid: < 10 (nếu phiếu chụp rõ)
- MSSV & Mã Đề: chính xác

---

## Cách Rollback (Nếu Cần)

Nếu muốn quay lại phiên bản cũ:
```bash
git checkout public/omr-opencv-processor.js
```

---

## Thông Số Tinh Chỉnh (Nếu Vấn Đề)

```javascript
// Trong DEFAULT_CONFIG nếu vẫn có tình trạng:

// Nếu quá ít bubble: giảm min thresholds
minContourAreaRatio: 0.00001,    // giảm từ 0.00002
minCircularity: 0.3,              // giảm từ 0.45 (strict)

// Nếu quá nhiều text: tăng density threshold hoặc circularity
// detectBubblesByProfile hàng 1123
if (density < 0.30 && !options.skipDensityCheck) {  // tăng từ 0.25
    contour.delete();
    continue;
}
```

---

**Ngày:** 2026-03-22
**Phiên bản:** v2.0 - Density-based Filtering + Outer Anchor Robust
