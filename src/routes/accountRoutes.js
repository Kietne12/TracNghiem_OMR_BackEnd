import express from "express";
import * as controller from "../controllers/accountController.js";

const router = express.Router();

// GET ALL
router.get("/", controller.getAccounts);

// CREATE
router.post("/", controller.createAccount);

// DELETE
router.delete("/:id", controller.deleteAccount);

// LOCK / UNLOCK
router.put("/lock/:id", controller.toggleLock);

// UPDATE ACCOUNT
router.put("/:id", controller.updateAccount);

export default router;