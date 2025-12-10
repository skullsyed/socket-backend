import express from "express";
import {
  register,
  login,
  userList,
  verifyToken,
} from "../controllers/authController.js";
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify-token", verifyToken);
router.get("/getAllUser", userList);

export default router;
