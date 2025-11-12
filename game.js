// public/game.js
const socket = io("https://spello.onrender.com"); 
const username = localStorage.getItem("username");
const roomCode = localStorage.getItem("roomCode");

document.getElementById("room-code-display").textContent = `Room: ${roomCode}`;
socket.emit("joinRoom", { roomCode, username });

let isAdmin = false;

const becomeAdminBtn = document.getElementById("become-admin-btn");
const adminControls = document.getElementById("admin-controls");
const bigWordInput = document.getElementById("big-word-input");
const timerSelect = document.getElementById("timer-select");
const startRoundBtn = document.getElementById("start-round-btn");

const bigWordDisplay = document.getElementById("big-word-display");
const bigWordText = document.getElementById("big-word-text");
const timerCountdown = document.getElementById("timer-countdown");

// Become Admin
becomeAdminBtn.addEventListener("click", () => {
  socket.emit("requestAdmin");
});

// Admin granted
socket.on("adminGranted", () => {
  isAdmin = true;
  becomeAdminBtn.style.display = "none";
  adminControls.style.display = "block";
});

// Admin denied
socket.on("adminDenied", () => {
  becomeAdminBtn.disabled = true;
  becomeAdminBtn.textContent = "Admin already chosen";
});

// Show or hide "Become Admin" based on server status
socket.on("adminStatus", (exists) => {
  becomeAdminBtn.style.display = exists ? "none" : "inline-block";
});

// Start Round
startRoundBtn.addEventListener("click", () => {
  const bigWord = bigWordInput.value.trim();
  const timer = parseInt(timerSelect.value);
  if (!bigWord || !timer) return alert("Enter word and timer");
  socket.emit("startRound", { bigWord, timer });
});

// Round started
socket.on("roundStarted", ({ bigWord, timer }) => {

const startMsg = document.getElementById("game-started-message");
startMsg.style.display = "block";

setTimeout(() => {
  startMsg.style.display = "none";
}, 10000); 


  adminControls.style.display = "none";
  bigWordDisplay.style.display = "block";
  bigWordText.textContent = bigWord;
  document.getElementById("wordSubmitSection").style.display = "block";
  let remaining = timer;
  timerCountdown.textContent = `${remaining}s`;

  const interval = setInterval(() => {
    remaining--;
    timerCountdown.textContent = `${remaining}s`;
    if (remaining <= 0) clearInterval(interval);
  }, 1000);
});

// Word Submission
const wordInput = document.getElementById("playerWordInput");
wordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();  
    event.stopPropagation(); 

    const word = wordInput.value.trim().toLowerCase();
    if (word) {
      socket.emit("submitWord", word);
      wordInput.value = "";
      // keep focus on same input
      setTimeout(() => wordInput.focus(), 100);
    }
  }
});


socket.on("updateMyWords", (wordList) => {
  const ul = document.getElementById("submitted-words");
  ul.innerHTML = "";
  wordList.forEach(word => {
    const li = document.createElement("li");
    li.textContent = word;
    ul.appendChild(li);
  });
});

// Leaderboard
socket.on("showLeaderboard", (scores) => {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const container = document.getElementById("leaderboard");
  container.innerHTML = "<h3>🏆 Leaderboard</h3>";
  const ul = document.createElement("ul");

  sorted.forEach(([name, score], i) => {
    const li = document.createElement("li");
    li.textContent = `${i === 0 ? "👑 " : ""}${name} - ${score} word(s)`;
    ul.appendChild(li);
  });

  container.appendChild(ul);
  document.getElementById("play-again-btn").style.display = "inline-block";
});

// Reset on play again
document.getElementById("play-again-btn").addEventListener("click", () => {
  socket.emit("playAgain");
});

socket.on("resetForNextRound", () => {
  document.getElementById("leaderboard").innerHTML = "";
  document.getElementById("play-again-btn").style.display = "none";
  document.getElementById("submitted-words").innerHTML = "";
  bigWordDisplay.style.display = "none";
  document.getElementById("wordSubmitSection").style.display = "none";
});

socket.on("adminRevoked", () => {
  becomeAdminBtn.style.display = "inline-block";
  becomeAdminBtn.disabled = false;
  becomeAdminBtn.textContent = "BECOME ADMIN";
  adminControls.style.display = "none";
});

// Players List
socket.on("updatePlayers", (usernames) => {
  const playerList = document.getElementById("player-list");
  playerList.innerHTML = "";
  usernames.forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    playerList.appendChild(li);
  });
});

// Chat

const chatInput = document.getElementById("chat-input");
chatInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter" && chatInput.value.trim()) {
    socket.emit("chatMessage", { message: chatInput.value.trim() });
    chatInput.value = "";
  }
});
document.querySelectorAll(".emoji-button").forEach(btn => {
  btn.addEventListener("click", () => {
    const chatInput = document.getElementById("chat-input");
    chatInput.value += btn.textContent;
    chatInput.focus();
  });
});


socket.on("chatMessage", ({ username, message }) => {
  const chatBox = document.getElementById("chat-box");
  const msg = document.createElement("div");
  msg.innerHTML = `<strong>${username}:</strong> ${message}`;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// Copy Room Code
const copyBtn = document.getElementById("copy-room-btn");
const copyConfirm = document.getElementById("copy-confirm");

copyBtn.addEventListener("click", () => {
  const roomText = localStorage.getItem("roomCode");
  navigator.clipboard.writeText(roomText).then(() => {
    copyConfirm.style.display = "inline";
    setTimeout(() => copyConfirm.style.display = "none", 1500);
  });
});

