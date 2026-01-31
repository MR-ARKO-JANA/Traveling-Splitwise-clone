// Let's get this person signed up!
document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const btn = e.target.querySelector("button");
    const originalText = btn.innerHTML;
    
    // Grab what they typed in
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // Quick sanity check
    if (!name || !email || !password) {
        showMessage("⚠️ Hey, looks like you missed a field!", "error");
        return;
    }

    if (name.length < 2) {
        showMessage("⚠️ Come on, give us at least 2 characters for your name", "error");
        return;
    }

    if (!isValidEmail(email)) {
        showMessage("⚠️ That email doesn't look quite right", "error");
        return;
    }

    if (password.length < 6) {
        showMessage("⚠️ Password needs to be at least 6 characters", "error");
        return;
    }

    // Show them we're working
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating your account...';
    btn.disabled = true;
    btn.classList.add('loading');

    try {
        console.log('Trying to sign up:', email);
        
        const res = await fetch("http://localhost:5000/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();
        console.log('Server response:', data);

        if (res.ok) {
            showMessage("🎉 Welcome aboard! Taking you to your dashboard...", "success");
            localStorage.setItem("token", data.token);
            
            // Give them a moment to see the success message
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1500);
        } else {
            console.error('Signup didn\'t work:', data);
            showMessage("❌ " + (data.message || "Something went wrong"), "error");
        }
    } catch (err) {
        console.error('Network trouble:', err);
        showMessage("❌ Can't reach the server right now", "error");
    } finally {
        // Put the button back to normal
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.classList.remove('loading');
    }
});

// Utility function to validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Enhanced notification system
function showMessage(message, type) {
    // Remove any existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `message ${type}`;
    notification.innerHTML = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

// Let's give them some helpful feedback as they type
document.getElementById("name").addEventListener("input", function() {
    const name = this.value.trim();
    if (name.length > 0 && name.length < 2) {
        this.style.borderColor = "#ff5252";
    } else if (name.length >= 2) {
        this.style.borderColor = "#00e676";
    } else {
        this.style.borderColor = "rgba(255, 255, 255, 0.2)";
    }
});

document.getElementById("email").addEventListener("input", function() {
    const email = this.value.trim();
    if (email.length > 0) {
        if (isValidEmail(email)) {
            this.style.borderColor = "#00e676";
        } else {
            this.style.borderColor = "#ff5252";
        }
    } else {
        this.style.borderColor = "rgba(255, 255, 255, 0.2)";
    }
});

document.getElementById("password").addEventListener("input", function() {
    const password = this.value;
    if (password.length > 0) {
        if (password.length >= 6) {
            this.style.borderColor = "#00e676";
        } else {
            this.style.borderColor = "#ff5252";
        }
    } else {
        this.style.borderColor = "rgba(255, 255, 255, 0.2)";
    }
});

// Make Enter key work nicely
document.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        const signupForm = document.getElementById("signupForm");
        if (signupForm) {
            signupForm.dispatchEvent(new Event('submit'));
        }
    }
});