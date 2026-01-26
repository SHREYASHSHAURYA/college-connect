// ===== CONFIG =====
const API = window.location.origin;
const token = localStorage.getItem("token");

async function authFetch(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + token,
      ...(options.headers || {})
    }
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.clear();
    window.location.href = "login.html";
    throw new Error("Unauthorized");
  }

  return res;
}

function avatarHTML(user, size = 36) {
  const img = user.profilePic
    ? `${API}/uploads/${user.profilePic}`
    : `${API}/uploads/default-avatar.png`;

  return `
    <span style="display:inline-flex;align-items:center;gap:8px;">
      <img
        src="${img}"
        onerror="this.src='${API}/uploads/default-avatar.png'"
        style="
          width:${size}px;
          height:${size}px;
          border-radius:50%;
          object-fit:cover;
          flex-shrink:0;
        "
      >
      <span>${user.name || user.email}</span>
    </span>
  `;
}

if (!token) {
  alert("No token found. Please login again.");
  window.location.href = "login.html";
}

// ===== HELPERS =====
async function apiGet(path) {
  const res = await authFetch(path);

  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

async function apiText(path) {
  const res = await authFetch(path);

  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text;
}

// ===== DOM ELEMENTS =====
const friendsBtn = document.getElementById("friendsBtn");
const requestsBtn = document.getElementById("requestsBtn");
const output = document.getElementById("output");
const sendBtn = document.getElementById("sendBtn");
const emailInput = document.getElementById("emailInput");
// ===== CURRENT VIEW STATE =====
let currentView = null; 
// "friends" | "requests" | "blocked"

// ===== LOAD FRIENDS =====
friendsBtn.onclick = async () => {
  currentView = "friends";
  output.innerHTML = "<h3>Your Friends</h3>";

  try {
    const friends = await apiGet("/friends");

    if (friends.length === 0) {
      output.innerHTML += "<p>No friends yet</p>";
      return;
    }

    friends.forEach(f => {
      const div = document.createElement("div");

      div.innerHTML = `
        <div class="profile-link" style="cursor:pointer">
          ${avatarHTML(f, 36)}
        </div>
        <br>
        <button>Unfriend</button>
        <button>Block</button>
      `;

      // ✅ SAME REDIRECT AS MARKETPLACE / FORUM / CHAT
      div.querySelector(".profile-link").onclick = () => {
        window.location.href =
          `/profile.html?email=${encodeURIComponent(f.email)}`;
      };

      div.querySelectorAll("button")[0].onclick = async () => {
        if (!confirm(`Unfriend ${f.email}?`)) return;
        await apiText(`/unfriend?email=${f.email}`);
        friendsBtn.onclick();
      };

      div.querySelectorAll("button")[1].onclick = async () => {
        if (!confirm(`Block ${f.email}?`)) return;
        await apiText(`/block?email=${f.email}`);
        friendsBtn.onclick();
      };

      output.appendChild(div);
    });
  } catch (e) {
    output.innerHTML = "ERROR: " + e.message;
  }
};
// ===== LOAD PENDING REQUESTS =====
requestsBtn.onclick = async () => {
  currentView = "requests";
  output.innerHTML = "<h3>Pending Requests</h3>";

  try {
    const requests = await apiGet("/pending-requests");

    if (requests.length === 0) {
      output.innerHTML += "<p>No pending requests</p>";
      return;
    }

    requests.forEach(u => {
      const div = document.createElement("div");

      div.innerHTML = `
        <div class="profile-link" style="cursor:pointer">
          ${avatarHTML(u, 36)}
        </div>
        <br>
        <button>Accept</button>
        <button>Decline</button>
        <button>Block</button>
      `;

      // ✅ SAME REDIRECT
      div.querySelector(".profile-link").onclick = () => {
        window.location.href =
          `/profile.html?email=${encodeURIComponent(u.email)}`;
      };

      const buttons = div.querySelectorAll("button");

      buttons[0].onclick = async () => {
        await apiText(`/accept-request?fromEmail=${u.email}`);
        requestsBtn.onclick();
      };

      buttons[1].onclick = async () => {
        await apiText(`/decline-request?fromEmail=${u.email}`);
        requestsBtn.onclick();
      };

      buttons[2].onclick = async () => {
        if (!confirm(`Block ${u.email}?`)) return;
        await apiText(`/block?email=${u.email}`);
        requestsBtn.onclick();
      };

      output.appendChild(div);
    });
  } catch (e) {
    output.innerHTML = "ERROR: " + e.message;
  }
};
// ===== LOAD BLOCKED USERS =====
const blockedBtn = document.getElementById("blockedBtn");

blockedBtn.onclick = async () => {
  currentView = "blocked";
  output.innerHTML = "<h3>Blocked Users</h3>";

  try {
    const blocked = await apiGet("/blocked");

    if (blocked.length === 0) {
      output.innerHTML += "<p>No blocked users</p>";
      return;
    }

    blocked.forEach(u => {
      const div = document.createElement("div");
      div.innerHTML = `
        ${avatarHTML(u, 32)}
        <button>Unblock</button>
      `;

      div.querySelector("button").onclick = async () => {
        await apiText(`/unblock?email=${u.email}`);
        blockedBtn.onclick(); // refresh list
      };

      output.appendChild(div);
    });
  } catch (e) {
    output.innerHTML = "ERROR: " + e.message;
  }
};

// ===== SEND FRIEND REQUEST =====
sendBtn.onclick = async () => {
  const email = emailInput.value.trim();
  if (!email) {
    alert("Enter email");
    return;
  }

  try {
    const msg = await apiText(`/send-request?toEmail=${email}`);
    alert(msg);
    emailInput.value = "";
  } catch (e) {
    alert(e.message);
  }
};

// ===== POLLING (AUTO REFRESH FRIENDS UI) =====
setInterval(() => {
  if (currentView === "friends") {
    friendsBtn.onclick();
  } else if (currentView === "requests") {
    requestsBtn.onclick();
  } else if (currentView === "blocked") {
    blockedBtn.onclick();
  }
}, 5000); // every 5 seconds