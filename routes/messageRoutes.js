import express from "express";
import {
  saveMessage,
  getMessages,
  getUnreadCount,
  markMessagesAsRead,
} from "../controllers/messageController.js";

const router = express.Router();

router.post("/createMessage", saveMessage);
router.get("/getAllMessage", getMessages);
router.get("/getUnreadCount", getUnreadCount);
router.post("/markAsRead", markMessagesAsRead);

export default router;
