# Practice API Documentation

## Overview
The Practice (BaiLuyenTap) system allows teachers to create practice exercises that students can attempt multiple times with auto-grading and score tracking.

## Base URL
```
http://localhost:5000/api/practice
```

## Authentication
All endpoints require JWT token in `Authorization: Bearer <token>` header (except GET list/detail).

---

## Endpoints

### 1. Create Practice Exercise
**POST** `/`

Create a new practice assignment.

**Request Body:**
```json
{
  "ten_bai": "Bài tập Chương 1",
  "mo_ta": "Ôn tập về hàm số và giới hạn",
  "so_cau": 20,
  "thoi_gian_lam_bai": 60,
  "lop_id": 1,
  "mon_hoc_id": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "ten_bai": "Bài tập Chương 1",
    "mo_ta": "Ôn tập về hàm số và giới hạn",
    "so_cau": 20,
    "thoi_gian_lam_bai": 60,
    "lop_id": 1,
    "mon_hoc_id": 1,
    "trang_thai": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. Get Practice List
**GET** `/`

Get all practices with optional filters.

**Query Parameters:**
- `lop_id` (optional): Filter by class
- `mon_hoc_id` (optional): Filter by subject

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ten_bai": "Bài tập Chương 1",
      "mo_ta": "...",
      "so_cau": 20,
      "thoi_gian_lam_bai": 60,
      "lop_id": 1,
      "mon_hoc_id": 1,
      "trang_thai": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### 3. Get Practice Detail
**GET** `/:id`

Get specific practice with history records.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "ten_bai": "Bài tập Chương 1",
    "mo_ta": "...",
    "so_cau": 20,
    "thoi_gian_lam_bai": 60,
    "lop_id": 1,
    "mon_hoc_id": 1,
    "trang_thai": "active",
    "lich_su_bai_luyen_taps": [
      {
        "id": 1,
        "bai_luyen_tap_id": 1,
        "sinh_vien_id": 10,
        "thoi_gian_bat_dau": "2024-01-15T11:00:00Z",
        "thoi_gian_nop": "2024-01-15T11:15:00Z",
        "tong_diem": 8.5,
        "trang_thai": "da_nop"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 4. Update Practice
**PUT** `/:id`

Update practice settings.

**Request Body:**
```json
{
  "ten_bai": "Updated name",
  "mo_ta": "Updated description",
  "so_cau": 25,
  "thoi_gian_lam_bai": 90,
  "trang_thai": "inactive"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated practice object */ }
}
```

---

### 5. Delete Practice
**DELETE** `/:id`

Remove a practice exercise.

**Response (200):**
```json
{
  "success": true,
  "message": "Practice deleted successfully"
}
```

---

### 6. Start Practice (Begin Attempt)
**POST** `/:bai_luyen_tap_id/start`

Create a new attempt record for a student.

**Request Body:**
```json
{
  "sinh_vien_id": 10  // Optional if authenticated
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "bai_luyen_tap_id": 1,
    "sinh_vien_id": 10,
    "thoi_gian_bat_dau": "2024-01-15T11:00:00Z",
    "thoi_gian_nop": null,
    "tong_diem": null,
    "trang_thai": "dang_lam"
  }
}
```

---

### 7. Submit Practice (Submi Answers)
**POST** `/lich-su/:lich_su_bai_id/submit`

Submit answers for a practice attempt. Scores are calculated immediately.

**Request Body:**
```json
{
  "answers": [
    { "cau_hoi_id": 1, "dap_an_student": "A" },
    { "cau_hoi_id": 2, "dap_an_student": "B" },
    { "cau_hoi_id": 3, "dap_an_student": "C" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "lich_su_bai_id": 1,
    "correctCount": 2,
    "totalCount": 3,
    "score": "6.67",
    "trang_thai": "da_nop"
  }
}
```

---

### 8. Get Practice Result
**GET** `/lich-su/:lich_su_bai_id/result`

View detailed results of a practice attempt including question-by-question breakdown.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "bai_luyen_tap_id": 1,
    "sinh_vien_id": 10,
    "thoi_gian_bat_dau": "2024-01-15T11:00:00Z",
    "thoi_gian_nop": "2024-01-15T11:15:00Z",
    "tong_diem": 8.5,
    "trang_thai": "da_nop",
    "chi_tiet_bai_luyen_taps": [
      {
        "id": 1,
        "lich_su_bai_id": 1,
        "cau_hoi_id": 1,
        "dap_an_student": "A",
        "dap_an_dung": "A",
        "dung_sai": true,
        "cau_hoi": {
          "id": 1,
          "noi_dung": "Question text...",
          "a": "Option A",
          "b": "Option B",
          "c": "Option C",
          "d": "Option D"
        }
      }
    ]
  }
}
```

---

### 9. Get Student Practice History
**GET** `/:bai_luyen_tap_id/history`

Get all attempts by a student for a specific practice.

**Query Parameters:**
- `sinh_vien_id` (optional): Student ID, defaults to authenticated user

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "bai_luyen_tap_id": 1,
      "sinh_vien_id": 10,
      "thoi_gian_bat_dau": "2024-01-15T11:00:00Z",
      "thoi_gian_nop": "2024-01-15T11:15:00Z",
      "tong_diem": 8.5,
      "trang_thai": "da_nop"
    },
    {
      "id": 2,
      "bai_luyen_tap_id": 1,
      "sinh_vien_id": 10,
      "thoi_gian_bat_dau": "2024-01-20T14:00:00Z",
      "thoi_gian_nop": "2024-01-20T14:20:00Z",
      "tong_diem": 9.0,
      "trang_thai": "da_nop"
    }
  ]
}
```

---

### 10. Get Practice Statistics (Class Level)
**GET** `/:bai_luyen_tap_id/statistics`

View class-level statistics for a practice exercise.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tong_sinh_vien_lam": 45,
    "so_sinh_vien_da_nop": 43,
    "diem_trung_binh": "7.45",
    "diem_cao_nhat": 10,
    "diem_thap_nhat": 4.5,
    "chi_tiet": [
      {
        "lich_su_bai_id": 1,
        "sinh_vien_id": 10,
        "sinh_vien_name": "Nguyễn Văn A",
        "ma_so": "SV001",
        "tong_diem": 8.5,
        "thoi_gian_bat_dau": "2024-01-15T11:00:00Z",
        "thoi_gian_nop": "2024-01-15T11:15:00Z",
        "trang_thai": "da_nop"
      }
    ]
  }
}
```

---

### 11. Get Student Practice Statistics (All Practices)
**GET** `/thong-ke/student/:sinh_vien_id`

Get aggregated statistics for all practices attempted by a student.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "lich_su_bai_id": 1,
      "bai_luyen_tap_id": 1,
      "ten_bai": "Bài tập Chương 1",
      "tong_diem": 8.5,
      "thoi_gian_bat_dau": "2024-01-15T11:00:00Z",
      "thoi_gian_nop": "2024-01-15T11:15:00Z",
      "trang_thai": "da_nop"
    }
  ]
}
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Answers must be an array"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Practice not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Usage Flow

### Teacher: Create Practice
1. POST / to create practice
2. Add questions to database separately
3. Set so_cau to match question count

### Student: Do Practice
1. POST /:id/start → Get lich_su_bai_id
2. (Student answers questions in UI)
3. POST /lich-su/:lich_su_bai_id/submit with answers
4. Get /lich-su/:lich_su_bai_id/result to view results

### Teacher: View Statistics
1. GET /:id/statistics for class-level stats
2. GET /thong-ke/student/:sinh_vien_id for individual student

### Redo Practice
1. Student calls POST /:id/start again (creates new record)
2. Completes another attempt
3. Previous attempts preserved in history

---

## Key Implementation Details

- **Auto-grading**: Binary comparison (correct answer vs student answer)
- **Score calculation**: (correct_count / total_count) × 10
- **Status values**: `dang_lam` (in progress), `da_nop` (submitted), `da_cham` (graded)
- **All timestamps**: ISO 8601 format
