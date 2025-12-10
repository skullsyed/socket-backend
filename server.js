import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);
// CORS configuration - MUST be before routes
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://socket-frontend-main.netlify.app",
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Temporarily allow all for debugging
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cache-Control",
    "X-Requested-With",
    "Accept",
    "Origin",
    "User-Agent",
    "Pragma",
    "Expires",
    "DNT",
    "X-CustomHeader",
  ],
  exposedHeaders: ["Content-Length", "X-Request-Id"],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// Add a test route to verify server is working
app.get("/", (req, res) => {
  res.json({
    message: "Socket Backend Server Running",
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is healthy" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://socket-frontend-main.netlify.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

const users = {}; // userId → socketId

io.on("connection", (socket) => {
  console.log("\n=== New Socket Connection ===");
  console.log("Socket ID:", socket.id);
  console.log("Time:", new Date().toISOString());

  socket.on("user-connected", (userId) => {
    console.log("\n*** USER-CONNECTED EVENT RECEIVED ***");
    console.log("User ID:", userId);
    console.log("Socket ID:", socket.id);

    if (userId) {
      const oldSocketId = users[userId];
      if (oldSocketId && oldSocketId !== socket.id) {
        console.log(
          `User ${userId} had old socket ${oldSocketId}, replacing...`
        );
      }

      users[userId] = socket.id;
      console.log(`✓✓✓ User ${userId} registered with socket ${socket.id}`);
      console.log("Currently online users:", Object.keys(users));
      console.log("User-Socket mapping:", users);

      socket.emit("registration-confirmed", { userId, socketId: socket.id });
      socket.broadcast.emit("user-online", userId);
    } else {
      console.log("✗ ERROR: Received user-connected without userId!");
    }
  });

  socket.on("private-message", (data) => {
    console.log("\n=== Private Message Event ===");
    console.log("Received from socket:", socket.id);
    console.log("Sender ID:", data.senderId);
    console.log("Receiver ID:", data.receiverId);

    const receiverSocketId = users[data.receiverId];
    console.log("Receiver socket ID:", receiverSocketId);

    if (receiverSocketId) {
      const messageToSend = {
        _id: data._id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        message: data.message || data.text,
        text: data.message || data.text,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      io.to(receiverSocketId).emit("private-message", messageToSend);
      console.log(
        `✓✓✓ Message successfully sent to socket ${receiverSocketId}`
      );
    } else {
      console.log(`✗✗✗ User ${data.receiverId} is offline`);
    }
    console.log("=========================\n");
  });

  socket.on("typing", (data) => {
    console.log("\n=== Typing Event ===");
    console.log("User typing:", data.userId);
    console.log("To receiver:", data.receiverId);

    const receiverSocketId = users[data.receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user-typing", {
        userId: data.userId,
        receiverId: data.receiverId,
      });
      console.log(`✓ Typing notification sent to ${data.receiverId}`);
    }
    console.log("==================\n");
  });

  socket.on("stopped-typing", (data) => {
    console.log("\n=== Stopped Typing Event ===");
    console.log("User stopped typing:", data.userId);

    const receiverSocketId = users[data.receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user-stopped-typing", {
        userId: data.userId,
        receiverId: data.receiverId,
      });
      console.log(`✓ Stopped typing notification sent to ${data.receiverId}`);
    }
    console.log("===========================\n");
  });

  socket.on("disconnect", (reason) => {
    console.log("\n=== User Disconnected ===");
    console.log("Socket ID:", socket.id);
    console.log("Reason:", reason);

    let disconnectedUserId = null;
    Object.keys(users).forEach((key) => {
      if (users[key] === socket.id) {
        disconnectedUserId = key;
        delete users[key];
      }
    });

    if (disconnectedUserId) {
      console.log(`User ${disconnectedUserId} removed from online users`);
      socket.broadcast.emit("user-offline", disconnectedUserId);
    }

    console.log("Remaining online users:", Object.keys(users));
    console.log("========================\n");
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`⏰ Started at ${new Date().toISOString()}\n`);
});
