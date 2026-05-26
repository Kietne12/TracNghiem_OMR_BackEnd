# OMR Documentation

Tai lieu nay gom cac ghi chu OMR can giu lai sau khi don bot nhieu file Markdown rieng le.

## Workflow

1. Giang vien tao ky thi OMR trong man hinh tao ky thi.
2. Giang vien tai de thi Word va phieu OMR PDF tu ky thi da tao.
3. Sinh vien lam bai tren phieu OMR da in.
4. Giang vien upload anh phieu OMR da quet.
5. Backend luu file, doc du lieu OMR, cham diem theo ma de va dap an dung.
6. Ket qua hien trong cac man hinh cham bai, thong ke diem thi va lich su lam bai.

## Endpoint Chinh

### Upload anh OMR

`POST /api/exams/:id/omr/upload`

Header:

```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Form-data:

```text
omr_image=<file jpg/png>
```

### Xu ly ket qua quet tu module ngoai

`POST /api/omr/process-scan`

Body:

```json
{
  "ky_thi_id": 1,
  "file_omr_id": 123,
  "mssv": "20260001",
  "ma_de": "MD001",
  "answers": ["A", "B", "C", "D"]
}
```

### Tai de OMR

`GET /api/exams/:id/omr/download-exam?ma_de=MD001`

Tra ve file Word `.docx` gom cau hoi va dap an theo ma de.

### Tai phieu OMR

`GET /api/exams/:id/omr/download-sheet`

Tra ve file PDF phieu OMR de in.

## File Code Lien Quan

- `src/controllers/examController.js`: tao/tai de, tai phieu, upload va cham OMR.
- `src/controllers/omrScannerController.js`: nhan ket qua quet tu module ngoai.
- `src/routes/omrRoutes.js`: route `/api/omr`.
- `src/utils/omrLayout.js`: toa do layout phieu OMR.
- `src/utils/omrDetectorEnhanced.js`: logic nhan dien OMR cuc bo.
- `src/scripts/generateOmrSample.js`: tao mau OMR test.
- `test_omr_detector.js`: test nhanh detector.

## Luu Y Van Hanh

- Anh upload nen la JPG/PNG ro net, du 4 goc phieu, khong cat mat vung dap an.
- MSSV va ma de phai trung voi du lieu ky thi.
- Neu detector khong doc duoc anh, backend tra ve loi de giang vien quet lai anh hoac xu ly bang module ngoai.
- Ket qua cham duoc luu vao `bai_lam`, `chi_tiet_bai_lam` va cac bang OMR lien quan.

## Test Nhanh

```bash
npm run omr:sample
npm run omr:test
```

## Tai Lieu Da Gop

Noi dung chinh duoc rut gon tu cac file cu:

- `OMR_API_GUIDE.md`
- `OMR_WORKFLOW.md`
- `OMR_QUICK_START.md`
- `OMR_TESTING_GUIDE.md`
- `OMR_DETECTION_GUIDE.md`
- `OMR_FIX_GUIDE.md`
- `OMR_ENHANCED_IMPLEMENTATION.md`
- `OMR_IMPLEMENTATION_SUMMARY.md`
- `OMR_CHANGES_SUMMARY.md`
- `OMR_CODE_SNIPPETS.md`
