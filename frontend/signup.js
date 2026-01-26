async function signup() {
  const name = document.getElementById("name").value;
  const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

if (!nameRegex.test(name.trim())) {
  const status = document.getElementById("status");
  status.className = "status error";
  status.innerText =
    "Name can contain only letters and single spaces";
  return;
}
  const email = document.getElementById("email").value;
  const collegeId = document.getElementById("collegeId").value;
const college =
  collegeId
    ? document.getElementById("collegeSearch").value
    : document.getElementById("manualCollege").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, college, collegeId, password })
    });

    const data = await res.json();

    if (!res.ok) {
      const status = document.getElementById("status");
status.className = "status error";
status.innerText = data.message || "Signup failed";
      return;
    }

    const status = document.getElementById("status");
status.className = "status success";
status.innerText = "Signup successful. You can now login.";

    /* 🔔 ADDED — REDIRECT TO LOGIN (NO BACKEND CHANGE) */
    setTimeout(() => {
      window.location.href = "/login";
    }, 800);

  } catch {
    const status = document.getElementById("status");
status.className = "status error";
status.innerText = "Server error";
  }
}

const searchInput = document.getElementById("collegeSearch");
const resultsBox = document.getElementById("collegeResults");
const collegeIdInput = document.getElementById("collegeId");
const manualCollegeInput = document.getElementById("manualCollege");

searchInput.addEventListener("focus", async () => {
  const dropdown = document.querySelector(".college-dropdown");
  dropdown.style.display = "block";

  // load initial list ONLY if empty
  if (resultsBox.children.length === 0) {
    const res = await fetch("/api/colleges?search=");
    const data = await res.json();

    resultsBox.innerHTML = "";
    data.forEach(c => {
      const li = document.createElement("li");
      li.textContent = c.name;
      li.onclick = () => {
        searchInput.value = c.name;
        collegeIdInput.value = c._id;
        manualCollegeInput.style.display = "none";
        resultsBox.innerHTML = "";
        dropdown.style.display = "none";
      };
      resultsBox.appendChild(li);
    });
  }
});

searchInput.addEventListener("input", async () => {
  const q = searchInput.value.trim();
  if (!q) {
    return;
  }

  const res = await fetch(`/api/colleges?search=${encodeURIComponent(q)}`);
  const data = await res.json();

  resultsBox.innerHTML = "";
  data.forEach(c => {
    const li = document.createElement("li");
    li.textContent = c.name;
    li.onclick = () => {
  searchInput.value = c.name;
  collegeIdInput.value = c._id;
  manualCollegeInput.style.display = "none";
  resultsBox.innerHTML = "";
  document.querySelector(".college-dropdown").style.display = "none";
};
    resultsBox.appendChild(li);
  });
});
function enableManualCollege() {
  collegeIdInput.value = "";

  // hide search completely
  searchInput.style.display = "none";

  manualCollegeInput.style.display = "block";
  manualCollegeInput.focus();

  resultsBox.innerHTML = "";
  document.querySelector(".college-dropdown").style.display = "none";
}