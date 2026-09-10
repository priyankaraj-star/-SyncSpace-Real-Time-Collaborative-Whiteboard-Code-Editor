const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("SyncSpace Server Running");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  ;
socket.on("join-room", (roomId) => {
  socket.join(roomId);

  console.log(`${socket.id} joined room: ${roomId}`);

  socket.to(roomId).emit("user-joined", socket.id);
});

socket.on("draw-line", (line) => {
  socket.broadcast.emit("draw-line", line);
});
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`SyncSpace server running on port ${PORT}`);
});