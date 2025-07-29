const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { Server } = require("socket.io");
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({
  origin: "https://sparkling-fenglisu-e1acbe.netlify.app",
  credentials: true // ← Add this
}));

const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: "https://sparkling-fenglisu-e1acbe.netlify.app",
    methods: ["GET", "POST"],
    credentials: true // ← Add this too
  }
});

app.get("/", (req, res) => {
  res.send("✅ Backend is running (Spello Game Server)");
});


const wordsPath = path.join(__dirname, "words.txt");
const validWords = new Set(fs.readFileSync(wordsPath, "utf-8").split("\n").map(w => w.trim().toLowerCase()));

const rooms = {}; // { roomCode: { players: [], admin: null, submittedWords: {}, bigWord: "", timer: 60 } }

io.on("connection", (socket) => {
  let roomCode = "";
  let username = "";

  socket.on("createRoom", () => {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomCode] = {
      players: [],
      admin: null,
      submittedWords: {},
      bigWord: "",
      timer: 60,
    };
    socket.emit("roomCreated", roomCode);
    console.log(`Room ${roomCode} created`);
  });

  socket.on("joinRoom", (data) => {
    roomCode = data.roomCode;
    username = data.username;
    if (!rooms[roomCode]) return socket.emit("roomError", "Room not found");

    socket.join(roomCode);
    rooms[roomCode].players.push({ id: socket.id, username });
    socket.emit("roomJoined", roomCode);
    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players.map(p => p.username));

    socket.emit("adminStatus", !!rooms[roomCode].admin);
  });

  socket.on("requestAdmin", () => {
    const room = rooms[roomCode];
    if (!room || room.admin) return socket.emit("adminDenied");
    room.admin = socket.id;
    socket.emit("adminGranted");
    socket.to(roomCode).emit("adminDenied");
  });

  socket.on("startRound", ({ bigWord, timer }) => {
    const room = rooms[roomCode];
    if (!room || socket.id !== room.admin) return;

    room.bigWord = bigWord.toLowerCase();
    room.timer = timer;
    room.submittedWords = {};

    io.to(roomCode).emit("roundStarted", { bigWord, timer });

    setTimeout(() => {
      const result = {};
      for (let player of room.players) {
        const uname = player.username;
        const score = room.submittedWords[uname]?.length || 0;
        result[uname] = score;
      }
      io.to(roomCode).emit("showLeaderboard", result);
    }, timer * 1000);
  });

  socket.on("submitWord", (word) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    word = word.trim().toLowerCase();
    const uname = player.username;

    if (!room.submittedWords[uname]) room.submittedWords[uname] = [];

    if (
      room.submittedWords[uname].includes(word) ||
      !validWords.has(word) ||
      !canFormFromBigWord(word, room.bigWord)
    ) return;

    room.submittedWords[uname].push(word);
    socket.emit("updateMyWords", room.submittedWords[uname]);
  });

  socket.on("playAgain", () => {
    const room = rooms[roomCode];
    if (room) {
      room.bigWord = "";
      room.submittedWords = {};
      room.timer = 60;
      room.admin = null;
      io.to(roomCode).emit("resetForNextRound");
      io.to(roomCode).emit("adminRevoked");
    }
  });

  socket.on("chatMessage", ({ message }) => {
    io.to(roomCode).emit("chatMessage", { username, message });
  });

  socket.on("disconnect", () => {
    const room = rooms[roomCode];
    if (!room) return;

    room.players = room.players.filter(p => p.id !== socket.id);
    io.to(roomCode).emit("updatePlayers", room.players.map(p => p.username));

    if (room.admin === socket.id) {
      room.admin = null;
      io.to(roomCode).emit("adminRevoked");
    }

    if (room.players.length === 0) {
      console.log(`⚠️ Room ${roomCode} is now empty. Waiting 5 minutes before deletion...`);
      setTimeout(() => {
        if (rooms[roomCode] && rooms[roomCode].players.length === 0) {
          delete rooms[roomCode];
          console.log(`🗑️ Room ${roomCode} deleted after 5 minutes (still empty).`);
        }
      }, 5 * 60 * 1000);
    }
  });
});

function canFormFromBigWord(word, bigWord) {
  const letters = bigWord.split("");
  for (let char of word) {
    const i = letters.indexOf(char);
    if (i === -1) return false;
    letters.splice(i, 1);
  }
  return true;
}

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});