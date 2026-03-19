let otpTimer;
let otpCountdown = 300;
let currentResetEmail = '';

document.getElementById("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    const originalText = btn.innerText;
    
    btn.innerText = "Logging in...";
    btn.disabled = true;

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const data = await authService.login(email, password);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "dashboard.html";
    } catch (err) {
        ui.showNotification(err.message || "Invalid credentials", "error");
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

function openForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'block';
    resetModalState();
}

function closeForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
    clearOTPTimer();
    resetModalState();
}

function resetModalState() {
    ['emailStep', 'otpStep', 'passwordStep'].forEach(id => {
        document.getElementById(id).style.display = id === 'emailStep' ? 'block' : 'none';
    });
    
    ['step1', 'step2', 'step3'].forEach((id, i) => {
        document.getElementById(id).className = `step ${i === 0 ? 'active' : ''}`;
    });
    
    ['resetEmail', 'otpCode', 'newPassword', 'confirmPassword'].forEach(id => {
        document.getElementById(id).value = '';
    });
    
    document.getElementById('modalMessage').innerHTML = '';
    currentResetEmail = '';
    otpCountdown = 300;
}

async function sendOTP() {
    const email = document.getElementById('resetEmail').value.trim();
    if (!email || !isValidEmail(email)) return showModalMessage('Invalid email', 'error');

    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;
    
    try {
        await authService.forgotPassword(email);
        currentResetEmail = email;
        showModalMessage('✅ Code sent! Check your email', 'success');
        
        setTimeout(() => {
            document.getElementById('emailStep').style.display = 'none';
            document.getElementById('otpStep').style.display = 'block';
            document.getElementById('step1').className = 'step completed';
            document.getElementById('step2').className = 'step active';
            startOTPTimer();
        }, 1500);
    } catch (err) {
        showModalMessage(err.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function verifyOTP() {
    const otp = document.getElementById('otpCode').value.trim();
    if (!otp || otp.length !== 6) return showModalMessage('Enter 6-digit OTP', 'error');

    const btn = event.target;
    btn.disabled = true;
    
    try {
        await authService.verifyOtp(currentResetEmail, otp);
        showModalMessage('Verified!', 'success');
        clearOTPTimer();
        
        setTimeout(() => {
            document.getElementById('otpStep').style.display = 'none';
            document.getElementById('passwordStep').style.display = 'block';
            document.getElementById('step2').className = 'step completed';
            document.getElementById('step3').className = 'step active';
        }, 1000);
    } catch (err) {
        showModalMessage(err.message, 'error');
        btn.disabled = false;
    }
}

async function resendOTP() {
    await sendOTP();
}

async function resetPassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const otp = document.getElementById('otpCode').value.trim();
    
    if (newPassword !== confirmPassword) return showModalMessage('Passwords do not match', 'error');
    if (newPassword.length < 6) return showModalMessage('Too short', 'error');

    const btn = event.target;
    btn.disabled = true;
    
    try {
        await authService.resetPassword(currentResetEmail, otp, newPassword);
        showModalMessage('Password reset successfully!', 'success');
        setTimeout(() => {
            closeForgotPasswordModal();
            ui.showNotification('Password updated!', 'success');
        }, 2000);
    } catch (err) {
        showModalMessage(err.message, 'error');
        btn.disabled = false;
    }
}

function startOTPTimer() {
    clearOTPTimer();
    otpTimer = setInterval(() => {
        const mins = Math.floor(otpCountdown / 60);
        const secs = otpCountdown % 60;
        document.getElementById('countdown').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        if (otpCountdown-- <= 0) {
            clearOTPTimer();
            showModalMessage('OTP expired', 'error');
        }
    }, 1000);
}

function clearOTPTimer() {
    if (otpTimer) clearInterval(otpTimer);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showModalMessage(msg, type) {
    const div = document.getElementById('modalMessage');
    div.innerHTML = `<div class="${type}-message">${msg}</div>`;
}

window.onclick = e => {
    if (e.target === document.getElementById('forgotPasswordModal')) closeForgotPasswordModal();
};