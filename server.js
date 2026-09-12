const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Y = require("yjs");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("SyncSpace Server Running");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});


/* =========================
   MONGODB
========================= */

const sessionSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true
    },

    yjsState: {
      type: Buffer,
      default: Buffer.alloc(0)
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
);

const Session = mongoose.model(
  "Session",
  sessionSchema
);


/* =========================
   ROOMS
========================= */

const rooms = new Map();


/* =========================
   CONNECT MONGODB
========================= */

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {

    console.log(
      "MongoDB Connected Successfully"
    );

  })
  .catch((error) => {

    console.error(
      "MongoDB Connection Error:",
      error.message
    );

  });


/* =========================
   SOCKET.IO
========================= */

io.on("connection", (socket) => {

  console.log(
    "User connected:",
    socket.id
  );


  /* =========================
     JOIN ROOM
  ========================= */

  socket.on(
    "join-room",
    async ({ roomId, userName }) => {

      try {

        if (!roomId || !userName) {
          return;
        }


        if (!rooms.has(roomId)) {
          rooms.set(
            roomId,
            new Map()
          );
        }


        const room =
          rooms.get(roomId);


        socket.join(roomId);

        socket.data.roomId =
          roomId;

        room.set(
          socket.id,
          {
            id: socket.id,
            name: userName
          }
        );


        /* =========================
           LOAD SAVED YJS DATA
        ========================= */

        const savedSession =
          await Session.findOne({
            roomId
          });


        if (
          savedSession &&
          savedSession.yjsState &&
          savedSession.yjsState.length > 0
        ) {

          socket.emit(
            "yjs-sync",
            Buffer.from(
              savedSession.yjsState
            ).toString("base64")
          );

        }


        socket.emit(
          "room-joined",
          {
            roomId,
            userName
          }
        );


        io.to(roomId).emit(
          "users-update",
          Array.from(
            room.values()
          )
        );


        console.log(
          `${userName} joined ${roomId}`
        );

      } catch (error) {

        console.error(
          "Join room error:",
          error
        );

      }

    }
  );


  /* =========================
     YJS UPDATE
  ========================= */

  socket.on(
    "yjs-update",
    async ({ roomId, update }) => {

      try {

        if (!roomId || !update) {
          return;
        }


        const updateBytes =
          Buffer.from(
            update,
            "base64"
          );


        /* Send to other users */

        socket
          .to(roomId)
          .emit(
            "yjs-update",
            update
          );


        /* =========================
           SAVE TO MONGODB
        ========================= */

        let doc =
          new Y.Doc();


        const existing =
          await Session.findOne({
            roomId
          });


        if (
          existing &&
          existing.yjsState &&
          existing.yjsState.length > 0
        ) {

          Y.applyUpdate(
            doc,
            new Uint8Array(
              existing.yjsState
            )
          );

        }


        Y.applyUpdate(
          doc,
          new Uint8Array(
            updateBytes
          )
        );


        const fullState =
          Y.encodeStateAsUpdate(
            doc
          );


        await Session.findOneAndUpdate(
          { roomId },

          {
            yjsState:
              Buffer.from(
                fullState
              ),

            updatedAt:
              new Date()
          },

          {
            upsert: true,
            new: true
          }
        );


      } catch (error) {

        console.error(
          "Yjs update error:",
          error
        );

      }

    }
  );


  /* =========================
     CURSOR / AWARENESS
  ========================= */

  socket.on(
    "awareness-update",
    ({ roomId, awareness }) => {

      if (!roomId) {
        return;
      }


      socket
        .to(roomId)
        .emit(
          "awareness-update",
          {
            id: socket.id,
            ...awareness
          }
        );

    }
  );


  /* =========================
     DISCONNECT
  ========================= */

  socket.on(
    "disconnect",
    () => {

      const roomId =
        socket.data.roomId;


      if (!roomId) {
        return;
      }


      const room =
        rooms.get(roomId);


      if (!room) {
        return;
      }


      room.delete(
        socket.id
      );


      socket
        .to(roomId)
        .emit(
          "awareness-remove",
          socket.id
        );


      io.to(roomId).emit(
        "users-update",
        Array.from(
          room.values()
        )
      );


      if (room.size === 0) {

        rooms.delete(
          roomId
        );

      }


      console.log(
        "User disconnected:",
        socket.id
      );

    }
  );

});


/* =========================
   START SERVER
========================= */

const PORT = 5000;

server.listen(
  PORT,
  () => {

    console.log(
      `SyncSpace Server running at http://localhost:${PORT}`
    );

  }
);