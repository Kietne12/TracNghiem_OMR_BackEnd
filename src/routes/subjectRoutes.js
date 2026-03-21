import express from "express"
import * as controller from "../controllers/subjectController.js"

const router = express.Router()

router.get("/", controller.getSubjects)
router.get("/:id", controller.getSubjectById)
router.post("/", controller.createSubject)
router.put("/:id", controller.updateSubject)
router.delete("/:id", controller.deleteSubject)

export default router