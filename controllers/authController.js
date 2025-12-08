import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);

    const newUser = await User.create({ name, email, password: hash });

    res.json({ message: "User registered", user: newUser });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid email" });
    console.log("Password received:", req.body.password);
    console.log("Password (json):", JSON.stringify(req.body.password));
    console.log("Stored Hash:", user.password);
    const match = await bcrypt.compare(password, user.password);
    console.log("match ", match);
    if (!match) return res.status(400).json({ error: "Wrong password" });
    console.log("match ", match);

    const token = jwt.sign({ id: user._id }, process.env.JWT_token, {
      expiresIn: "1d",
    });
    console.log("Token ", token);
    res.json({ token, user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const userList = async (req, res) => {
  try {
    const userList = await User.find();
    res.status(200).json({
      status: "success",
      message: "Users fetched successfully",
      data: userList,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: [],
    });
  }
};
