# 📋 OMR Sample - Hướng Dẫn Test

## ✅ File Sẵn Sàng

### **Phiếu PDF Mẫu** (CHÍNH XÁC từ examController)
```
samples/omr_sample_filled.pdf
```
- ✅ Layout **100% giống examController** - copy code từ function `downloadOmrSheet`
- 📐 Scroll tới xem chi tiết layout calculation
- 🎯 Phù hợp để **in trực tiếp** hoặc **screenshot để upload test**
- Tô kín bubble: 
  - ✅ SBD=00001 (hàng 0: tô 4 ô; hàng 1: tô ô cuối)
  - ✅ Mã đề=001 (hàng 0: tô 2 ô; hàng 1: tô ô cuối)
  - ✅ Q1=A, Q2=B, Q3=C

---

## 🧪 Cách Test Upload & Quét

### Bước 1: Chuẩn bị ảnh từ PDF
1. Mở `samples/omr_sample_filled.pdf`
2. Screenshot/export thành ảnh PNG (300 DPI nếu có thể)
3. Hoặc in ra + scan

### Bước 2: Upload để test quét
```bash
# Thay test.png bằng ảnh thực từ PDF
curl -X POST \
  -F "file=@test.png" \
  http://localhost:5000/api/exams/1/omr/upload
```

### Bước 3: Kiểm tra kết quả
**✅ Kỳ vọng Response (HTTP 201):**
```json
{
  "message": "Đã tải ảnh OMR, tự động chấm điểm và lưu kết quả",
  "auto_grade": {
    "status": "graded"
  },
  "result": {
    "mssv": "00001",          // ← SBD quét được (OCR)
    "ma_de": "001",           // ← Mã đề quét được (OCR)
    "so_cau_dung": 3,         // ← 3 câu đúng (Q1=A, Q2=B, Q3=C)
    "diem": 0.5               // ← Score (phụ thuộc config)
  }
}
```

**⚠️ Lưu ý:**
- Nếu OCR không đọc được SBD/Mã đề: sẽ trả HTTP 202 (pending)
- Cần ảnh chất lượng cao để OCR quét tốt
- Lần đầu quét chậm (~3-5s), lần sau nhanh hơn (cache)

---

## 📐 Chi Tiết Tô Bubble

### SBD (Số Báo Danh): `00001`
```
Ô vuông:  [0][0][0][0][1]
         
Hàng 0:   ●●●●⭕  (tô 4 ô tròn đầu)
Hàng 1:   ⭕⭕⭕⭕●  (tô ô tròn cuối)
Hàng 2-9: ⭕⭕⭕⭕⭕  (không tô)
```

### Mã Đề: `001`
```
Ô vuông:  [0][0][1]
         
Hàng 0:   ●●⭕  (tô 2 ô tròn đầu)
Hàng 1:   ⭕⭕●  (tô ô tròn cuối)
Hàng 2-9: ⭕⭕⭕  (không tô)
```

### Đáp Án
```
Câu 1:  ●⭕⭕⭕  (tô A)
Câu 2:  ⭕●⭕⭕  (tô B)
Câu 3:  ⭕⭕●⭕  (tô C)
Câu 4+: ⭕⭕⭕⭕  (không tô)
...
```

---

## 🧠 Quá trình Quét

1. **Backend nhận ảnh upload**
2. **Detector module:**
   - OCR SBD → "00001" ✓
   - OCR Mã đề → "001" ✓
   - Detect bubble → ['A', 'B', 'C', null, null, ...] ✓
3. **Tự động chấm** → So với đáp án đúng
4. **Return kết quả** → Score + số câu đúng

---

## 🔍 Chi Tiết Layout Code (Từ examController)

### SBD - Bubble Grid Calculation
```javascript
const digitColumns = 5;              // 5 cột cho SBD
const bubbleRadius = 5;              // Đường kính bubble = 10pt
const edgeGap = 10.5;               // Khoảng cách bubble edges
const centerSpacing = 2*5 + 10.5;   // = 20.5pt center-to-center

// Bubble positions (10 hàng: 0-9)
// Hàng 0, cột 0-4: bình thường
// Lần 1, cột 4: VD tô để biểu diễn "1" ở chữ số cuối
```

### Answer Grid Calculation
```javascript
const columnCount = 3;               // 3 cột (20 câu/cột)
const bubbleRadius = 5;              // Bubble size = 5pt
const answerEdgeGap = 5;            // Edge gap = 5pt
const rowHeight = 5 + 2*5;          // = 15pt center-to-center

// Bubble spacing cho A,B,C,D
const availableForBubbles = columnWidth - padding - 2*bubbleRadius;
const bubbleSpacing = (availableForBubbles - 2*bubbleRadius) / 3;
// Tính để D vừa fit trong box
```

### Visualization
```
A4 Page (595.28 × 841.89 pt)
│
├─ Margin: 24pt (all sides)
│
├─ Header: "PHIẾU TRẢ LỜI TRẮC NGHIỆM"
├─ Info boxes (250pt height):
│  ├─ Left (56% width):  Họ tên, MSSV, Lớp, ...
│  ├─ SBD (65% right):   5 ô vuông + 10 hàng bubble
│  └─ Mã đề (35% right): 3 ô vuông + 10 hàng bubble
│
└─ Answer Grid (60 questions):
   ├─ Col 1: Q01-Q20
   ├─ Col 2: Q21-Q40
   └─ Col 3: Q41-Q60
      (each with A, B, C, D bubbles)
```

---

## 📄 File Generation Scripts

- `generate_omr_sample_exact_from_controller.js` - Tạo PDF mẫu (copy 100% từ examController)
  - Sử dụng PDFKit
  - Render layout chính xác
  - Thêm filled bubbles

---

## 📊 Sample Files Location

```
samples/omr_sample_filled.pdf       # ← CHÍNH XÁC từ examController
```

**Sử dụng:**
1. Mở PDF → screenshot/print → scan
2. Upload ảnh để test quét
3. Kiểm tra result từ API

---

**✅ Status**: Phiếu mẫu chính xác 100% - sẵn sàng test
**📝 Updated**: 21/03/2026
