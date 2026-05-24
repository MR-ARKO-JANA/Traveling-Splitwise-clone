/**
 * UI Controller for Splitwise Clone
 * Standardizes notifications and common UI updates
 */
const ui = {
  showNotification(message, type = 'info') {
    // Use existing notification logic if present, else simple alert for now
    // This can be expanded with a proper toast component
    const notificationArea =
      document.getElementById('notificationArea') || this.createNotificationArea();

    const notification = document.createElement('div');
    notification.className = `notification ${type} fade-in`;
    notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getIconForType(type)}"></i>
                <span>${message}</span>
            </div>
        `;

    notificationArea.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  },

  createNotificationArea() {
    const area = document.createElement('div');
    area.id = 'notificationArea';
    area.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
    document.body.appendChild(area);
    return area;
  },

  getIconForType(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle',
    };
    return icons[type] || icons.info;
  },

  showLoading(show) {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  formatDate(dateString) {
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  },
};

window.ui = ui;
