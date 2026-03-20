import { Router } from "express";
import { processScanResult, uploadOmrImageOnly } from "../controllers/omrScannerController.js";

const router = Router();

// Endpoint để Python module gửi kết quả quét OMR
router.post("/process-scan", processScanResult);

export default router;
