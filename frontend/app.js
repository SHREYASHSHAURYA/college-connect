const API = window.location.origin;
let socket = null;

/* ---------------- LOGIN ---------------- */
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (!data.token) {
    document.getElementById("msg").innerText = "Login failed";
    return;
  }

  localStorage.setItem("token", data.token);
  window.location.href = "chat.html";
}

/* ---------------- CHAT INIT ---------------- */
if (window.location.pathname.includes("chat.html")) {
  const token = localStorage.getItem("token");
  if (!token) location.href = "login.html";

  const params = new URLSearchParams(window.location.search);
  const withEmail = params.get("with") || "alice@college.edu";

  loadHistory(withEmail, token);
  initSocket(token);
}

/* ---------------- LOAD CHAT HISTORY ---------------- */
async function loadHistory(withEmail, token) {
  const res = await fetch(
    API + `/messages?withEmail=${encodeURIComponent(withEmail)}`,
    {
      headers: {
        Authorization: "Bearer " + token
      }
    }
  );

  const messages = await res.json();

  messages.forEach((m) => {
    addMessage(m.sender.email + ": " + m.text);
  });
}

/* ---------------- SOCKET ---------------- */
function initSocket(token) {
  socket = io(API, {
    auth: { token }
  });

  socket.on("connect", () => {
    //console.log("Socket connected");
  });

  socket.onAny((event, msg) => {
    if (event.startsWith("chat-")) {
      addMessage(msg.sender.email + ": " + msg.text);
    }
  });
}

/* ---------------- SEND MESSAGE ---------------- */
async function sendMessage() {
  const toEmail = document.getElementById("toEmail").value;
  const text = document.getElementById("text").value;
  const token = localStorage.getItem("token");

  await fetch(
    API +
      `/send-message?toEmail=${encodeURIComponent(
        toEmail
      )}&text=${encodeURIComponent(text)}`,
    {
      headers: {
        Authorization: "Bearer " + token
      }
    }
  );

  document.getElementById("text").value = "";
}

/* ---------------- UI ---------------- */
function addMessage(text) {
  const box = document.getElementById("messages");
  const div = document.createElement("div");
  div.innerText = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}