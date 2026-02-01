let otpTimer;
let otpCountdown = 300;
let currentResetEmail = '';
let currentOTPToken = '';

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  const originalText = btn.innerText;
  
  btn.innerText = "Logging in...";
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
      showMessage(data.message || "Invalid credentials", "error");
      btn.innerText = originalText;
      btn.disabled = false;
    }
  } catch (err) {
    showMessage("Connection error", "error");
    btn.innerText = originalText;
    btn.disabled = false;
  }
});

function openForgotPasswordModal() {
  document.getElementById('forgotPasswordModal').style.display = 'block';
  resetModalState();
}

// Close forgot password modal
function closeForgotPasswordModal() {
  document.getElementById('forgotPasswordModal').style.display = 'none';
  clearOTPTimer();
  resetModalState();
}

// Reset modal to initial state
function resetModalState() {
  // Reset steps
  document.getElementById('emailStep').style.display = 'block';
  document.getElementById('otpStep').style.display = 'none';
  document.getElementById('passwordStep').style.display = 'none';
  
  // Reset step indicators
  document.getElementById('step1').className = 'step active';
  document.getElementById('step2').className = 'step';
  document.getElementById('step3').className = 'step';
  
  // Clear inputs
  document.getElementById('resetEmail').value = '';
  document.getElementById('otpCode').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  
  // Clear messages
  document.getElementById('modalMessage').innerHTML = '';
  
  // Reset variables
  currentResetEmail = '';
  currentOTPToken = '';
  otpCountdown = 300;
}

// Let's send that OTP!
async function sendOTP() {
  const email = document.getElementById('resetEmail').value.trim();
  
  if (!email) {
    showModalMessage('Hey, we need an email address first!', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showModalMessage('That email doesn\'t look quite right', 'error');
    return;
  }
  
  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending your code...';
  btn.disabled = true;
  
  try {
    console.log('Sending OTP to:', email);
    
    const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    console.log('Server says:', res.status);
    
    const data = await res.json();
    console.log('Got back:', data);
    
    if (res.ok) {
      currentResetEmail = email;
      currentOTPToken = data.token;
      
      if (data.emailSent) {
        showModalMessage('✅ Code sent! Check your email inbox', 'success');
      } else {
        showModalMessage('⚠️ Code generated but email had issues. Check the server console for your code.', 'warning');
      }
      
      // Move to the next step
      setTimeout(() => {
        document.getElementById('emailStep').style.display = 'none';
        document.getElementById('otpStep').style.display = 'block';
        document.getElementById('step1').className = 'step completed';
        document.getElementById('step2').className = 'step active';
        startOTPTimer();
      }, 2000);
    } else {
      console.error('Server trouble:', data);
      showModalMessage(data.message || 'Something went wrong sending the code', 'error');
    }
  } catch (err) {
    console.error('Network trouble:', err);
    showModalMessage('❌ Can\'t reach the server right now', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// Verify OTP
async function verifyOTP() {
  const otp = document.getElementById('otpCode').value.trim();
  
  if (!otp || otp.length !== 6) {
    showModalMessage('Please enter a valid 6-digit OTP', 'error');
    return;
  }
  
  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
  btn.disabled = true;
  
  try {
    const res = await fetch('http://localhost:5000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: currentResetEmail,
        otp: otp,
        token: currentOTPToken
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showModalMessage('OTP verified successfully!', 'success');
      clearOTPTimer();
      
      // Move to step 3
      setTimeout(() => {
        document.getElementById('otpStep').style.display = 'none';
        document.getElementById('passwordStep').style.display = 'block';
        document.getElementById('step2').className = 'step completed';
        document.getElementById('step3').className = 'step active';
      }, 1500);
    } else {
      showModalMessage(data.message || 'Invalid OTP', 'error');
    }
  } catch (err) {
    showModalMessage('Network error. Please try again.', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// Resend OTP
async function resendOTP() {
  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resending...';
  btn.disabled = true;
  
  try {
    const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentResetEmail })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      currentOTPToken = data.token;
      showModalMessage('New OTP sent successfully!', 'success');
      otpCountdown = 300;
      startOTPTimer();
    } else {
      showModalMessage(data.message || 'Failed to resend OTP', 'error');
    }
  } catch (err) {
    showModalMessage('Network error. Please try again.', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// Reset password
async function resetPassword() {
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (!newPassword || !confirmPassword) {
    showModalMessage('Please fill in all fields', 'error');
    return;
  }
  
  if (newPassword.length < 6) {
    showModalMessage('Password must be at least 6 characters long', 'error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showModalMessage('Passwords do not match', 'error');
    return;
  }
  
  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
  btn.disabled = true;
  
  try {
    const res = await fetch('http://localhost:5000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: currentResetEmail,
        newPassword: newPassword,
        token: currentOTPToken
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showModalMessage('Password reset successfully! You can now login with your new password.', 'success');
      
      // Close modal after success
      setTimeout(() => {
        closeForgotPasswordModal();
        showMessage('Password reset successful! Please login with your new password.', 'success');
      }, 2000);
    } else {
      showModalMessage(data.message || 'Failed to reset password', 'error');
    }
  } catch (err) {
    showModalMessage('Network error. Please try again.', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// Start OTP countdown timer
function startOTPTimer() {
  clearOTPTimer();
  
  otpTimer = setInterval(() => {
    const minutes = Math.floor(otpCountdown / 60);
    const seconds = otpCountdown % 60;
    
    document.getElementById('countdown').textContent = 
      `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (otpCountdown <= 0) {
      clearOTPTimer();
      showModalMessage('OTP expired. Please request a new one.', 'error');
    }
    
    otpCountdown--;
  }, 1000);
}

// Clear OTP timer
function clearOTPTimer() {
  if (otpTimer) {
    clearInterval(otpTimer);
    otpTimer = null;
  }
}

// Utility functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showModalMessage(message, type) {
  const messageDiv = document.getElementById('modalMessage');
  messageDiv.innerHTML = `<div class="${type}-message">${message}</div>`;
  
  // Clear message after 5 seconds
  setTimeout(() => {
    messageDiv.innerHTML = '';
  }, 5000);
}

function showMessage(message, type) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 10px;
    z-index: 10000;
    font-weight: 500;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease;
    color: white;
    max-width: 300px;
  `;
  
  if (type === 'success') {
    notification.style.background = 'linear-gradient(135deg, #00e676, #43cea2)';
  } else if (type === 'error') {
    notification.style.background = 'linear-gradient(135deg, #ff5252, #dd2476)';
  } else {
    notification.style.background = 'linear-gradient(135deg, #2196f3, #21cbf3)';
  }
  
  notification.innerHTML = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 4000);
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('forgotPasswordModal');
  if (event.target === modal) {
    closeForgotPasswordModal();
  }
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);