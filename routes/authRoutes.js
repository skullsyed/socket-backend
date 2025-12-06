import express from "express";
import { register, login, userList } from "../controllers/authController.js";
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/getAllUser", userList);

export default router;
