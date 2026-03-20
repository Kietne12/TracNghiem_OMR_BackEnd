# OMR Workflow Mới - Tài Liệu Vận Hành

## 📋 Quy Trình Hoạt Động

### Phase 1: Chuẩn bị (Giảng viên - Frontend)
1. **Tạo kỳ thi OMR**
   - Vào **Tạo kỳ thi** → Chọn lớp → Tạo kỳ thi với hình thức "Trắc nghiệm OMR"
   - Kỳ thi được lưu với danh sách câu hỏi

2. **Tải tài liệu OMR**
   - Bấm nút **"Tải đề"** → Tải file Word (.docx) có đầy đủ câu hỏi + 4 đáp án
   - Bấm nút **"Tải phiếu"** → Tải file PDF (.pdf) phiếu OMR tiêu chuẩn với ô bubble
   - In phiếu cho sinh viên

### Phase 2: Chấm điểm (Tự động qua Python + Backend)
1. **Sinh viên làm bài**
   - Tô đáp án trên phiếu OMR in từ Phase 1

2. **Quét ảnh phiếu**
   - Dùng Scanner quét thành ảnh JPG/PNG từ phiếu đã làm

3. **Upload ảnh quét** (Frontend - trang Upload OMR)
   - Vào **Upload OMR**
   - Chọn kỳ thi OMR → Chọn ảnh phiếu → Bấm **"Upload ảnh OMR"**
   - Backend lưu ảnh, mở file ra từ `/uploads/omr/...`

4. **Python module quét ảnh** (Python - server riêng)
   - Python module dùng OpenCV + Tesseract để quét:
     - **Ô MSSV**: Lấy mã sinh viên (format: 20260001)
     - **Ô mã đề**: Lấy mã đề (format: MD001)
     - **Các ô bubble**: Lấy đáp án được tô (A, B, C, D)
   - Gửi kết quả đến backend endpoint: `POST /api/omr/process-scan`

5. **Backend xử lý kết quả** (Backend - Node.js)
   - Endpoint `/api/omr/process-scan` nhận:
     - MSSV, mã đề, mảng đáp án
   - So sánh đáp án student với đáp án đúng từ cấu hình kỳ thi
   - Tính điểm: `(số câu đúng / tổng câu) × 10`
   - Lưu vào DB:
     - **BaiLam**: Bài làm + điểm
     - **ChiTietBaiLam**: Chi tiết từng câu (đáp án student, đáp án đúng, đúng/sai)
     - **KetQuaOMR**: Meta dữ liệu OMR (mã đề, số câu đúng)

### Phase 3: Xem kết quả (Frontend - Chấm bài)
1. **Kết quả tự động xuất hiện**
   - Vào **Chấm bài**
   - Lọc: Kỳ học → Năm học → Chọn lớp → Chọn kỳ thi OMR
   - Kết quả OMR xuất hiện ngay cạnh kết quả online (cùng bảng)
   - Cột: Mã SV | Họ tên | Câu đúng | Điểm | Trạng thái ✓

---

## 🔧 Cấu Hình Hệ Thống

### Backend (Node.js - Port 5000)
**File mới tạo:**
- `src/controllers/omrScannerController.js` - Xử lý kết quả quét
- `src/routes/omrRoutes.js` - Route nhập liệu quét
- `OMR_API_GUIDE.md` - Tài liệu API

**File đã cập nhật:**
- `src/controllers/examController.js` - Download exam (Word) + download sheet (PDF)
- `src/app.js` - Thêm route `/api/omr`

### Frontend (React - Port 5173)
**File cập nhật:**
- `src/pages/giangvien/TaoKyThi.tsx` - Thêm nút tải đề/phiếu
- `src/pages/giangvien/UploadOMR.tsx` - Đơn giản: chỉ upload ảnh
- `src/pages/giangvien/ChamBai.tsx` - Load thực từ backend

---

## 📡 API Endpoint Mới

### 1. Download Đề OMR (Word)
```
GET /api/exams/:id/omr/download-exam?ma_de=MD001
Response: File .docx
```

### 2. Download Phiếu OMR (PDF)
```
GET /api/exams/:id/omr/download-sheet
Response: File .pdf
```

### 3. Upload Ảnh OMR (Frontend)
```
POST /api/exams/:id/omr/upload
Content-Type: multipart/form-data
Body: omr_image: <File>
Response: {"file": {...}, "next_step": "..."}
```

### 4. Process Scan Result (Python → Backend)
```
POST /api/omr/process-scan
Content-Type: application/json
Body: {
  "ky_thi_id": 1,
  "file_omr_id": 123,      // optional
  "mssv": "20260001",
  "ma_de": "MD001",
  "answers": ["A", "B", "C", ...]
}
Response: {"message": "OK", "result": {...}}
```

---

## 🐍 Cài Đặt Python Module

### Dependencies
```bash
pip install opencv-python pytesseract pillow numpy
```

### Thiết lập Tesseract (Windows)
Tải dari: https://github.com/UB-Mannheim/tesseract/wiki
Cài đặt → Thêm vào PATH

### Template Code (Python)
```python
import requests
import cv2
import pytesseract
from PIL import Image

IMAGE_PATH = "phieu.jpg"
API_URL = "http://localhost:5000/api/omr/process-scan"

def scan_omr(image_path):
    img = cv2.imread(image_path)
    
    # Quét MSSV từ vùng xác định
    mssv = extract_mssv(img)
    
    # Quét mã đề
    ma_de = extract_ma_de(img)
    
    # Quét đáp án (bubble detection)
    answers = extract_answers(img, num_questions=50)  # giả sử 50 câu
    
    # Gửi kết quả đến backend
    payload = {
        "ky_thi_id": 1,  # cần lấy từ frontend hoặc config
        "mssv": mssv,
        "ma_de": ma_de,
        "answers": answers  # ["A", "B", "C", ...]
    }
    
    response = requests.post(API_URL, json=payload)
    print(response.json())

def extract_answers(img, num_questions):
    # OCR bubble detection logic
    # Trả về ["A", "B", "C", ...] với độ dài = num_questions
    pass
```

---

## ⚠️ Lưu Ý Quan Trọng

1. **Mã đề phải khớp** với danh sách mã đề trong kỳ thi
   - Nếu kỳ thi chỉ có MD001, MD002 → phiếu phải tô MD001 hoặc MD002
   - Nếu không khớp → backend sẽ báo lỗi (nếu áp dụng validation)

2. **Số câu phải đúng**
   - Phiếu có 50 ô → phải gửi 50 đáp án
   - Nếu sơ suất → sẽ bị reject

3. **Format đáp án**
   - Chỉ chấp nhận: A, B, C, D (chữ in hoa)
   - Tự động normalize từ dữ liệu input

4. **MSSV phải tồn tại**
   - MSSV không có trong DB → lỗi
   - Cần đảm bảo tất cả sinh viên đã được thêm vào lớp

---

## 🎯 Test Nhanh

### Tại sao cần test?
- Kiểm tra Python module hoạt động
- Kiểm tra backend nhận dữ liệu
- Kiểm tra dữ liệu xuất hiện trong Chấm bài

### Bước test
1. **Backend chạy:**
   ```bash
   cd TracNghiem_OMR_BackEnd
   npm run dev
   ```

2. **Frontend chạy:**
   ```bash
   cd trac-nghiem-omr-app
   npm run dev
   ```

3. **Test manual endpoint:**
   ```bash
   # Gửi kết quả giả lập
   curl -X POST http://localhost:5000/api/omr/process-scan \
     -H "Content-Type: application/json" \
     -d '{
       "ky_thi_id": 1,
       "mssv": "20260001",
       "ma_de": "MD001",
       "answers": ["A","B","C","D","A"]
     }'
   ```

4. **Kiểm tra Chấm bài:**
   - Vào trang Chấm bài
   - Lọc lớp/kỳ thi OMR
   - Xem sinh viên có xuất hiện không

---

## 📊 Trạng Thái Hiện Tại

✅ **Backend:**
- ✓ Controller OMR scan `omrScannerController.js`
- ✓ Route `/api/omr/process-scan`
- ✓ Download exam (Word), download sheet (PDF)
- ✓ Tính điểm + lưu BaiLam, ChiTietBaiLam, KetQuaOMR

✅ **Frontend:**
- ✓ Upload OMR đơn giản (chỉ ảnh)
- ✓ Tải đề/phiếu từ trang Tạo kỳ thi
- ✓ Chấm bài load từ API thực

⏳ **Python Module:**
- Cần phát triển/cài đặt riêng
- Template code ở trên
- API endpoint sẵn sàng

---

## 🚀 Bước Tiếp Theo

1. **Phát triển Python module** quét OMR
2. **Test end-to-end** từ upload ảnh → xuất hiện trong Chấm bài
3. **Tuning** tính điểm, format dữ liệu theo yêu cầu thực tế
4. **Deploy production** trên server chính thức
