// public/script.js
const socket = io("https://spello.onrender.com"); 

const createBtn = document.getElementById("create-btn");
const joinBtn = document.getElementById("join-btn");

if (createBtn) {
  createBtn.addEventListener("click", () => {
    socket.emit("createRoom");
  });

  socket.on("roomCreated", (roomCode) => {
    document.getElementById("room-display").textContent = `Room Code: ${roomCode}`;
  });
}

if (joinBtn) {
  joinBtn.addEventListener("click", () => {
    const code = document.getElementById("room-code-input").value.trim().toUpperCase();
    const username = document.getElementById("username-input").value.trim();
    if (!username) return alert("Please enter a username");
    localStorage.setItem("username", username);
    localStorage.setItem("roomCode", code);
    socket.emit("joinRoom", { roomCode: code, username });
  });

  socket.on("roomJoined", (roomCode) => {
    window.location.href = "game.html";
  });

  socket.on("roomError", (msg) => {
    alert(msg);
  });
}
