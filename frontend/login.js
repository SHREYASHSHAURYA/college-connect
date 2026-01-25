async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      const status = document.getElementById("status");
status.className = "status error";
status.innerText = data.message || "Login failed";
return;
    }

    // SAVE TOKEN
    localStorage.setItem("token", data.token);

    // DECODE JWT (NO BACKEND CHANGE)
    const payload = JSON.parse(atob(data.token.split(".")[1]));

    // SAVE REQUIRED FIELDS
    localStorage.setItem("email", payload.email);
    localStorage.setItem("college", payload.college);
    localStorage.setItem("role", payload.role);   // ✅ ADD THIS
    localStorage.setItem("name", data.user.name);

    const status = document.getElementById("status");
status.className = "status success";
status.innerText = "Login successful";

    /* 🔔 ADDED — REDIRECT TO DASHBOARD (NO EXISTING LINE TOUCHED) */
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 500);

  } catch (e) {
    const status = document.getElementById("status");
status.className = "status error";
status.innerText = "Server error";
  }
}