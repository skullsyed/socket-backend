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

// Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
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

  // Register user when they connect
  socket.on("user-connected", (userId) => {
    console.log("\n*** USER-CONNECTED EVENT RECEIVED ***");
    console.log("User ID:", userId);
    console.log("Socket ID:", socket.id);

    if (userId) {
      // Remove old socket if user was connected with different socket
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

      // Send confirmation back to the user
      socket.emit("registration-confirmed", { userId, socketId: socket.id });

      // Notify other users that this user is online
      socket.broadcast.emit("user-online", userId);
    } else {
      console.log("✗ ERROR: Received user-connected without userId!");
    }
  });

  // Handle private messages
  socket.on("private-message", (data) => {
    console.log("\n=== Private Message Event ===");
    console.log("Received from socket:", socket.id);
    console.log("Message data:", JSON.stringify(data, null, 2));
    console.log("Sender ID:", data.senderId);
    console.log("Receiver ID:", data.receiverId);

    const receiverSocketId = users[data.receiverId];
    console.log("Looking up receiver socket...");
    console.log("Receiver socket ID:", receiverSocketId);
    console.log("All online users:", Object.keys(users));
    console.log("Full user mapping:", users);

    if (receiverSocketId) {
      // Emit to the specific receiver
      const messageToSend = {
        _id: data._id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        message: data.message || data.text,
        text: data.message || data.text,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      console.log("Sending message to receiver:", messageToSend);
      io.to(receiverSocketId).emit("private-message", messageToSend);
      console.log(
        `✓✓✓ Message successfully sent to socket ${receiverSocketId}`
      );
    } else {
      console.log(
        `✗✗✗ CRITICAL: User ${data.receiverId} is offline (not in users map)`
      );
      console.log("Available users:", Object.keys(users));
      console.log(
        "Did this user connect? Check user-connected event logs above."
      );
    }
    console.log("=========================\n");
  });

  // Handle typing indicator
  socket.on("typing", (data) => {
    console.log("\n=== Typing Event ===");
    console.log("User typing:", data.userId);
    console.log("To receiver:", data.receiverId);

    const receiverSocketId = users[data.receiverId];
    console.log("Receiver socket:", receiverSocketId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user-typing", {
        userId: data.userId,
        receiverId: data.receiverId,
      });
      console.log(`✓ Typing notification sent to ${data.receiverId}`);
    } else {
      console.log(`✗ Receiver ${data.receiverId} not online`);
      console.log("Online users:", Object.keys(users));
    }
    console.log("==================\n");
  });

  // Handle stopped typing indicator
  socket.on("stopped-typing", (data) => {
    console.log("\n=== Stopped Typing Event ===");
    console.log("User stopped typing:", data.userId);
    console.log("To receiver:", data.receiverId);

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

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    console.log("\n=== User Disconnected ===");
    console.log("Socket ID:", socket.id);
    console.log("Reason:", reason);

    // Find and remove user from users object
    let disconnectedUserId = null;
    Object.keys(users).forEach((key) => {
      if (users[key] === socket.id) {
        disconnectedUserId = key;
        delete users[key];
      }
    });

    if (disconnectedUserId) {
      console.log(`User ${disconnectedUserId} removed from online users`);
      // Notify other users that this user is offline
      socket.broadcast.emit("user-offline", disconnectedUserId);
    }

    console.log("Remaining online users:", Object.keys(users));
    console.log("========================\n");
  });
});

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`⏰ Started at ${new Date().toISOString()}\n`);
});
