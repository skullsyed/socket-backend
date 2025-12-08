import express from "express";
import { saveMessage, getMessages } from "../controllers/messageController.js";

const router = express.Router();

router.post("/createMessage", saveMessage);
router.get("/getAllMessage", getMessages);

export default router;
