const API = window.location.origin;
const token = localStorage.getItem("token");

if (!token) {
  document.getElementById("status").innerText = "Not logged in";
} else {
  loadProfile();
}

async function loadProfile() {
  try {
    const res = await fetch(`${API}/profile`, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      document.getElementById("status").innerText = "Failed to load profile";
      return;
    }

    const user = await res.json();

    document.getElementById("name").innerText = user.name;
    document.getElementById("email").innerText = user.email;
    document.getElementById("college").innerText = user.college;

  } catch {
    document.getElementById("status").innerText = "Server error";
  }
}