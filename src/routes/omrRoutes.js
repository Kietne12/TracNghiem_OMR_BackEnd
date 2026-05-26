import { Router } from "express";
import { processScanResult } from "../controllers/omrScannerController.js";

const router = Router();

// Endpoint cho scanner bên ngoài gửi kết quả OMR đã đọc.
router.post("/process-scan", processScanResult);

export default router;
