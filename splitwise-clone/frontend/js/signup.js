document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = e.target.querySelector('button');
  const originalText = btn.innerHTML;

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!name || !email || !password) {
    ui.showNotification('⚠️ Missing fields', 'error');
    return;
  }

  if (name.length < 2) {
    ui.showNotification('⚠️ Name too short', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    ui.showNotification('⚠️ Invalid email', 'error');
    return;
  }

  if (password.length < 6) {
    ui.showNotification('⚠️ Password must be at least 6 characters', 'error');
    return;
  }

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
  btn.disabled = true;

  try {
    const data = await authService.signup({ name, email, password });
    ui.showNotification('🎉 Welcome aboard!', 'success');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
  } catch (err) {
    ui.showNotification(err.message, 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Helpers for input feedback
const updateInputFeedback = (el, isValid) => {
  if (el.value.length === 0) {
    el.style.borderColor = 'rgba(255, 255, 255, 0.2)';
  } else {
    el.style.borderColor = isValid ? '#00e676' : '#ff5252';
  }
};

document.getElementById('name').addEventListener('input', function () {
  updateInputFeedback(this, this.value.trim().length >= 2);
});

document.getElementById('email').addEventListener('input', function () {
  updateInputFeedback(this, isValidEmail(this.value.trim()));
});

document.getElementById('password').addEventListener('input', function () {
  updateInputFeedback(this, this.value.length >= 6);
});
