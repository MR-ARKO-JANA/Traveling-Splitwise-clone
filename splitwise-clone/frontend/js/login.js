document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  const originalText = btn.innerText;
  
  // Dynamic Loading State
  btn.innerText = "Verifying...";
  btn.disabled = true;

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("token", data.token);
      window.location.href = "dashboard.html";
    } else {
      alert("⚠️ " + (data.message || "Invalid Credentials"));
      btn.innerText = originalText;
      btn.disabled = false;
    }
  } catch (err) {
    alert("❌ Network Error: Server is offline");
    btn.innerText = originalText;
    btn.disabled = false;
  }
});