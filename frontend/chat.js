const token = localStorage.getItem("token");
if (!token) alert("No token");

const socket = io({
  auth: { token }
});

const messagesUl = document.getElementById("messages");

function render(msg, meEmail) {
  const li = document.createElement("li");
  if (msg.sender.email === meEmail) {
    li.innerText = "You: " + msg.text + " ✔";
  } else {
    li.innerText = msg.sender.email + ": " + msg.text;
  }
  messagesUl.appendChild(li);
}

/* LOAD CHAT HISTORY */
async function loadHistory() {
  messagesUl.innerHTML = "";
  const withEmail = document.getElementById("withEmail").value;

  const res = await fetch(
  `/messages?withEmail=${withEmail}`,
  {
    headers: { Authorization: "Bearer " + token }
  }
);

  const data = await res.json();
  const me = JSON.parse(atob(token.split(".")[1])).email;

  data.forEach(msg => render(msg, me));
}

/* SOCKET RECEIVE */
socket.on("receive-message", async () => {
  await loadHistory();
});

/* SEND MESSAGE */
function send() {
  const toEmail = document.getElementById("toEmail").value;
  const text = document.getElementById("text").value;

  socket.emit("send-message", { toEmail, text });
  loadHistory();
}