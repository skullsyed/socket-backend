import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const register = async (req, res) => {
  try {
    console.log("Register request received:", req.body);

    const { name, email, password } = req.body;

    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ error: "Email already exists" });

    console.log("Hashing password...");
    const hash = await bcrypt.hash(password, 10);

    console.log("Creating user...");
    const newUser = await User.create({ name, email, password: hash });

    console.log("User created successfully:", newUser._id);
    res.json({ message: "User registered", user: newUser });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
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

    // Check if JWT_token is configured
    if (!process.env.JWT_token) {
      console.error("JWT_token environment variable is not set!");
      return res.status(500).json({ error: "Server configuration error" });
    }
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

export const verifyToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ valid: false, error: "No token provided" });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const decoded = jwt.verify(token, process.env.JWT_token);

    // Optional: Check if user still exists in database
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ valid: false, error: "User not found" });
    }

    res.json({
      valid: true,
      user: user,
      message: "Token is valid",
    });
  } catch (error) {
    console.error("Token verification error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ valid: false, error: "Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ valid: false, error: "Invalid token" });
    }

    res.status(500).json({ valid: false, error: "Server error" });
  }
};

export const userList = async (req, res) => {
  try {
    // Exclude password field from the results
    const userList = await User.find().select("-password");
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
