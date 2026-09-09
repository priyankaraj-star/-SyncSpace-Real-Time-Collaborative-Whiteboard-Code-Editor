import { useState } from "react";
import socket from "./socket";

function App() {
  const [roomId, setRoomId] = useState("");

  const joinRoom = () => {
    if (roomId.trim() === "") {
      alert("Please enter a Room ID");
      return;
    }

    socket.emit("join-room", roomId);

    alert(`Joined room: ${roomId}`);
  };

  return (
    <div>
      <h1>SyncSpace</h1>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />

        <button onClick={joinRoom}>
          Join Room
        </button>
      </div>

      <div style={{ display: "flex", height: "80vh" }}>
        <div
          style={{
            width: "50%",
            border: "1px solid black",
            padding: "20px",
          }}
        >
          <h2>Whiteboard</h2>
          <p>Whiteboard area</p>
        </div>

        <div
          style={{
            width: "50%",
            border: "1px solid black",
            padding: "20px",
          }}
        >
          <h2>Code Editor</h2>
          <p>Code editor area</p>
        </div>
      </div>
    </div>
  );
}

export default App;