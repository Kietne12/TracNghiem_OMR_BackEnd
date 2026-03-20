# API Endpoint cho Python Module Quét OMR

## 1. Upload ảnh OMR (Frontend/Human)
- **Endpoint:** `POST /api/exams/:id/omr/upload`
- **Header:** `Authorization: Bearer <token>`
- **Multipart:** Form-data với `omr_image` (file)
- **Response:**
  ```json
  {
    "message": "Đã tải ảnh OMR. Python module sẽ quét và gửi kết quả...",
    "file": {
      "id": 123,
      "ten_file": "omr_image.jpg",
      "duong_dan": "/uploads/omr/..."
    },
    "next_step": "Chờ Python module quét MSSV/mã đề/đáp án rồi gọi /api/omr/process-scan"
  }
  ```

---

## 2. Gửi kết quả quét (Python Module)
- **Endpoint:** `POST /api/omr/process-scan`
- **No Auth Required** (từ Python server, không qua Frontend)
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "ky_thi_id": 1,
    "file_omr_id": 123,
    "mssv": "20260001",
    "ma_de": "MD001",
    "answers": ["A", "B", "C", "D", "A", "B"]
  }
  ```

- **Fields:**
  - `ky_thi_id` (required): ID kỳ thi
  - `file_omr_id` (optional): ID file OMR đã upload (từ response step 1)
  - `mssv` (required): Mã sinh viên (quét từ ô MSSV)
  - `ma_de` (required): Mã đề (quét từ ô mã đề, ví dụ "MD001")
  - `answers` (required): Mảng đáp án được tô (["A", "B", "C", ...])

- **Response (Success):**
  ```json
  {
    "message": "Đã xử lý kết quả quét OMR và cập nhật kết quả",
    "result": {
      "bai_lam_id": 456,
      "sinh_vien_id": 789,
      "mssv": "20260001",
      "ho_ten": "Nguyễn Văn A",
      "ma_de": "MD001",
      "so_cau_dung": 45,
      "tong_so_cau": 50,
      "diem": 9.0
    }
  }
  ```

- **Response (Error):**
  ```json
  {
    "message": "Lỗi chi tiết..."
  }
  ```

---

## 3. Lấy đề OMR (để in)
- **Endpoint:** `GET /api/exams/:id/omr/download-exam?ma_de=MD001`
- **Header:** `Authorization: Bearer <token>`
- **Response:** File Word (.docx) với tên `<tên kỳ thi>_<tên lớp>_<mã đề>.docx`

---

## 4. Lấy phiếu OMR (để in)
- **Endpoint:** `GET /api/exams/:id/omr/download-sheet`
- **Header:** `Authorization: Bearer <token>`
- **Response:** File PDF (.pdf) `phieu-omr-<id>.pdf`

---

## Lưu ý quan trọng

### Format mã đề
- Mã đề cần khớp với danh sách mã đề trong cấu hình kỳ thi
- Ví dụ: `MD001`, `MD002`, v.v.
- Nếu không khớp → Backend sẽ cảnh báo lỗi

### Format đáp án
- Mảng ["A", "B", "C", "D", ...] hoặc chuỗi "A,B,C,D,..."
- Chỉ nhận chữ in hoa: A, B, C, D
- Số lượng đáp án phải bằng số câu trong kỳ thi

### Thiết lập ứng dụng Python
1. Upload ảnh bằng endpoint 1 (lấy file_omr_id)
2. Quét ảnh bằng OpenCV/Tesseract để lấy: MSSV, mã đề, đáp án
3. Gửi kết quả đến endpoint 2 (`/api/omr/process-scan`)
4. Kết quả tự động xuất hiện trong mục **Chấm bài**

### Xác thực
- `/api/omr/process-scan` hiện không bắt buộc token (có thể update sau)
- Các endpoint khác yêu cầu JWT bearer token
- Token lấy từ `/api/auth/login`

---

## Ví dụ cURL
```bash
# 1. Login
curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"giangvien","password":"123456"}'

# Response: {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}

# 2. Upload ảnh
curl -X POST http://localhost:5000/api/exams/1/omr/upload \\
  -H "Authorization: Bearer <token>" \\
  -F "omr_image=@phieu.jpg"

# Response: {"file":{"id":123,...},...}

# 3. Python gửi kết quả quét
curl -X POST http://localhost:5000/api/omr/process-scan \\
  -H "Content-Type: application/json" \\
  -d '{
    "ky_thi_id": 1,
    "file_omr_id": 123,
    "mssv": "20260001",
    "ma_de": "MD001",
    "answers": ["A","B","C","D","A","B","B","A","C","D"]
  }'

# Response: {"message":"Đã xử lý...","result":{...}}
```
