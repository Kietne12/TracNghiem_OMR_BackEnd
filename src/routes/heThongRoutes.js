import express from "express"
import * as controller from "../controllers/heThongController.js"

const router = express.Router()

router.get("/settings", controller.getSettings)
router.put("/settings", controller.updateSettings)

router.post("/backup", controller.backup)
router.get("/backup", controller.getBackupHistory)

router.post("/restore", controller.uploadMiddleware, controller.restore)
router.get("/backup/download/:filename", controller.downloadBackup)

export default router