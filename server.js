import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import mongoose from "mongoose";

const app = express();
const server = http.createServer(app);

const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ===============================
// BASIC ROUTES
// ===============================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 SyncSpace Server is Running!"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "SyncSpace API is Working!"
  });
});

// ===============================
// SOCKET CONNECTION
// ===============================

io.on("connection", (socket) => {

  console.log("🟢 User connected:", socket.id);

  // =============================
  // JOIN ROOM
  // =============================

  socket.on("join-room", ({ roomId, username }) => {

    if (!roomId || !username) {
      console.log("Room ID or username missing");
      return;
    }

    socket.join(roomId);

    socket.data.roomId = roomId;
    socket.data.username = username;

    console.log(
      `👤 ${username} joined room: ${roomId}`
    );

    // Send notification to other users
    socket.to(roomId).emit("user-joined", {
      id: socket.id,
      username: username
    });

  });

  // =============================
  // CODE EDITOR REAL-TIME SYNC
  // =============================

  socket.on("code-change", ({ roomId, code }) => {

    console.log(
      `💻 Code updated in room: ${roomId}`
    );

    socket.to(roomId).emit(
      "code-change",
      code
    );

  });

  // =============================
  // WHITEBOARD REAL-TIME SYNC
  // =============================

  socket.on("canvas-update", ({ roomId, canvas }) => {

    console.log(
      `🎨 Whiteboard updated in room: ${roomId}`
    );

    socket.to(roomId).emit(
      "canvas-update",
      canvas
    );

  });

  // =============================
  // CHAT / MESSAGE SUPPORT
  // =============================

  socket.on("send-message", ({ roomId, username, message }) => {

    socket.to(roomId).emit("receive-message", {
      username,
      message
    });

  });

  // =============================
  // USER DISCONNECT
  // =============================

  socket.on("disconnect", () => {

    console.log(
      "🔴 User disconnected:",
      socket.id
    );

  });

});

// ===============================
// MONGODB CONNECTION
// ===============================

async function connectDatabase() {

  try {

    if (!process.env.MONGO_URI) {

      console.log(
        "⚠️ MONGO_URI not found."
      );

      console.log(
        "Running server without MongoDB."
      );

      return;

    }

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "✅ MongoDB connected successfully!"
    );

  } catch (error) {

    console.log(
      "❌ MongoDB connection failed:"
    );

    console.log(
      error.message
    );

  }

}

// ===============================
// START SERVER
// ===============================

async function startServer() {

  await connectDatabase();

  server.listen(PORT, () => {

    console.log("");
    console.log("================================");
    console.log("🚀 SyncSpace Server Started");
    console.log("================================");
    console.log(
      `🌐 http://localhost:${PORT}`
    );
    console.log("================================");
    console.log("");

  });

}

startServer();