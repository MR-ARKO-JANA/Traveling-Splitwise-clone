// Check authentication
const token = localStorage.getItem("token");
if (!token) {
    window.location.href = "index.html";
}

const headers = { 
    "Content-Type": "application/json", 
    "Authorization": `Bearer ${token}`
};

// Global flag to prevent multiple simultaneous loads
let isLoadingPassport = false;

// Load passport data on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize immediately
    setupDragAndDrop();
    addSuccessAnimation();
    
    // Load data only once
    if (!isLoadingPassport) {
        loadPassport();
        loadRecentActivity();
    }
});

// Setup drag and drop for profile image
function setupDragAndDrop() {
    const avatar = document.querySelector('.avatar');
    const profileImage = document.getElementById('profileImage');
    
    if (!avatar || !profileImage) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        avatar.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        avatar.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        avatar.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    avatar.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        avatar.classList.add('drag-over');
    }
    
    function unhighlight(e) {
        avatar.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                // Simulate file input change
                const input = document.getElementById('profileImage');
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input.files = dataTransfer.files;
                displayImage(input);
            } else {
                showNotification("Please drop an image file", "error");
            }
        }
    }
}

// Load and populate passport data
async function loadPassport() {
    // Prevent multiple simultaneous calls
    if (isLoadingPassport) {
        console.log("Already loading passport, skipping...");
        return;
    }
    
    isLoadingPassport = true;
    
    // Set a shorter timeout for better UX
    const loadingTimeout = setTimeout(() => {
        const nameElement = document.getElementById('userName');
        const emailElement = document.getElementById('userEmail');
        const joinDateElement = document.getElementById('joinDate');
        
        if (nameElement && nameElement.textContent === "Loading...") {
            nameElement.textContent = "Connection timeout";
            emailElement.textContent = "Please refresh the page";
            joinDateElement.textContent = "Check your internet connection";
            showNotification("Connection timeout. Please refresh the page.", "error");
        }
        isLoadingPassport = false;
    }, 8000); // Reduced to 8 seconds

    try {
        // Show loading state immediately
        const nameElement = document.getElementById('userName');
        const emailElement = document.getElementById('userEmail');
        const joinDateElement = document.getElementById('joinDate');
        
        if (nameElement) nameElement.textContent = "Loading...";
        if (emailElement) emailElement.textContent = "Loading...";
        if (joinDateElement) joinDateElement.textContent = "Loading...";

        // Create a timeout promise for the fetch
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 6000);
        });

        const fetchPromise = fetch("http://localhost:5000/api/profile/passport", { 
            headers,
            method: 'GET'
        });

        // Race between fetch and timeout
        const res = await Promise.race([fetchPromise, timeoutPromise]);
        
        clearTimeout(loadingTimeout);
        
        if (!res.ok) {
            if (res.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "index.html";
                return;
            }
            throw new Error(`Server error: ${res.status}`);
        }
        
        const data = await res.json();

        // Update user identity
        const profileDisplay = document.getElementById('profileDisplay');
        
        if (nameElement) nameElement.textContent = data.user.name || "Unknown User";
        if (emailElement) emailElement.textContent = data.user.email || "No email";
        
        const idElement = document.getElementById('userId');
        if (idElement) idElement.textContent = `ID #${(data.user._id || 'UNKNOWN').slice(-6).toUpperCase()}`;
        
        if (joinDateElement) {
            const joinDate = data.user.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : 'Unknown';
            joinDateElement.textContent = `Member since: ${joinDate}`;
        }
        
        // Update profile image
        if (profileDisplay) {
            if (data.user.profileImage) {
                profileDisplay.src = `http://localhost:5000${data.user.profileImage}`;
            } else {
                profileDisplay.src = 'https://via.placeholder.com/120x120/667eea/ffffff?text=👤';
            }
            profileDisplay.onerror = function() {
                this.src = 'https://via.placeholder.com/120x120/667eea/ffffff?text=👤';
            };
        }
        
        // Update statistics
        const groupCountElement = document.getElementById('groupCount');
        const expenseCountElement = document.getElementById('expenseCount');
        const settlementCountElement = document.getElementById('settlementCount');
        
        if (groupCountElement) groupCountElement.textContent = data.stats.groups || 0;
        if (expenseCountElement) expenseCountElement.textContent = data.stats.expenses || 0;
        if (settlementCountElement) settlementCountElement.textContent = data.stats.settlements || 0;

        // Update balance with proper styling
        const balanceDiv = document.getElementById('netBalanceCard');
        if (balanceDiv) {
            const balance = parseFloat(data.netBalance) || 0;
            balanceDiv.textContent = `NET BALANCE: ₹${balance.toFixed(2)}`;
            
            // Color coding based on balance
            if (balance > 0) {
                balanceDiv.style.background = "linear-gradient(135deg, #00e676, #43cea2)";
                balanceDiv.style.color = "#003";
            } else if (balance < 0) {
                balanceDiv.style.background = "linear-gradient(135deg, #ff5252, #dd2476)";
                balanceDiv.style.color = "#fff";
            } else {
                balanceDiv.style.background = "linear-gradient(135deg, #ffd54f, #ffb74d)";
                balanceDiv.style.color = "#333";
            }
        }

        // Store user data for later use
        localStorage.setItem("user", JSON.stringify(data.user));
        
        console.log("Profile loaded successfully");
        
        // Mark page as fully loaded
        document.body.classList.add('profile-loaded');
        
    } catch (err) {
        clearTimeout(loadingTimeout);
        console.error("Passport load error:", err);
        
        // Show specific error messages
        let errorMessage = "Failed to load profile data";
        if (err.message === 'Request timeout') {
            errorMessage = "Connection timeout. Please check your internet connection.";
        } else if (err.message.includes('Failed to fetch')) {
            errorMessage = "Cannot connect to server. Please check if the server is running.";
        }
        
        showNotification(errorMessage, "error");
        
        // Show error state
        const nameElement = document.getElementById('userName');
        const emailElement = document.getElementById('userEmail');
        const joinDateElement = document.getElementById('joinDate');
        
        if (nameElement) nameElement.textContent = "Error loading";
        if (emailElement) emailElement.textContent = "Please refresh";
        if (joinDateElement) joinDateElement.textContent = "Check connection";
    } finally {
        isLoadingPassport = false;
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const activities = JSON.parse(localStorage.getItem('recentActivities') || '[]');
        const activityList = document.getElementById("activityList");
        
        if (!activityList) return;
        
        if (activities.length === 0) {
            activityList.innerHTML = `
                <div style="text-align: center; color: rgba(255,255,255,0.6); padding: 20px;">
                    <i class="fas fa-history" style="font-size: 32px; margin-bottom: 10px; opacity: 0.3;"></i>
                    <p>No recent activity</p>
                    <small>Your transactions will appear here</small>
                </div>
            `;
            return;
        }
        
        activityList.innerHTML = "";
        
        activities.slice(0, 5).forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-details">
                    <p>${escapeHtml(activity.description)}</p>
                    <small>${formatDate(activity.timestamp)}</small>
                </div>
            `;
            activityList.appendChild(activityItem);
        });
    } catch (err) {
        console.error("Error loading activity:", err);
    }
}

// Show edit profile modal
function showEditProfileModal() {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    
    document.getElementById('editName').value = currentUser.name || "";
    document.getElementById('editEmail').value = currentUser.email || "";
    
    showModal('editProfileModal');
}

// Show change password modal
function showChangePasswordModal() {
    // Clear form
    document.getElementById('currentPassword').value = "";
    document.getElementById('newPassword').value = "";
    document.getElementById('confirmPassword').value = "";
    
    showModal('changePasswordModal');
}

// Update profile
async function updateProfile() {
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    
    if (!name) {
        showNotification("Name cannot be empty", "error");
        return;
    }
    
    if (!email || !email.includes('@')) {
        showNotification("Please enter a valid email", "error");
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    let currentPassword = "";
    
    // Ask for password if changing email
    if (email !== currentUser.email) {
        currentPassword = prompt("Enter your current password to change email:");
        if (currentPassword === null) return; // User cancelled
        
        if (!currentPassword) {
            showNotification("Password required to change email", "error");
            return;
        }
    }

    try {
        const updateData = { name, email };
        if (currentPassword) {
            updateData.currentPassword = currentPassword;
        }

        const res = await fetch("http://localhost:5000/api/profile/update", {
            method: "PUT",
            headers,
            body: JSON.stringify(updateData)
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showNotification("Profile updated successfully!", "success");
            hideModal('editProfileModal');
            await loadPassport(); // Reload profile data
        } else {
            showNotification(data.message || "Failed to update profile", "error");
        }
    } catch (err) {
        console.error("Profile update error:", err);
        showNotification("Failed to update profile. Please try again.", "error");
    }
}

// Change password
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword) {
        showNotification("Please enter your current password", "error");
        return;
    }
    
    if (!newPassword) {
        showNotification("Please enter a new password", "error");
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification("Password must be at least 6 characters", "error");
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification("Passwords don't match", "error");
        return;
    }

    try {
        const res = await fetch("http://localhost:5000/api/profile/update", {
            method: "PUT",
            headers,
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showNotification("Password changed successfully!", "success");
            hideModal('changePasswordModal');
        } else {
            showNotification(data.message || "Failed to change password", "error");
        }
    } catch (err) {
        console.error("Password change error:", err);
        showNotification("Failed to change password. Please try again.", "error");
    }
}

// Export user data
async function exportUserData() {
    try {
        // Get user data
        const userRes = await fetch("http://localhost:5000/api/profile/passport", { headers });
        const userData = await userRes.json();
        
        // Get groups
        const groupsRes = await fetch("http://localhost:5000/api/groups", { headers });
        const groupsData = await groupsRes.json();
        
        // Get balance details
        const balanceRes = await fetch("http://localhost:5000/api/balance/details", { headers });
        const balanceData = await balanceRes.json();
        
        const exportData = {
            user: userData.user,
            stats: userData.stats,
            netBalance: userData.netBalance,
            groups: groupsData,
            balanceDetails: balanceData,
            exportDate: new Date().toISOString(),
            exportedBy: "Splitwise Clone"
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `splitwise-profile-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification("Profile data exported successfully!", "success");
        addToActivity("Exported profile data", "export");
    } catch (err) {
        console.error("Export error:", err);
        showNotification("Failed to export data", "error");
    }
}

// Toggle setting
function toggleSetting(element) {
    element.classList.toggle('active');
    
    // Here you could save the setting to localStorage or send to server
    const isActive = element.classList.contains('active');
    const settingName = element.parentElement.querySelector('label').textContent;
    
    showNotification(`${settingName} ${isActive ? 'enabled' : 'disabled'}`, "success");
}

// Handle profile image upload
// ================= PROFILE IMAGE HANDLING =================

// Open file picker when image or camera icon clicked
function triggerClick() {
    const input = document.getElementById("profileImage");
    if (input) {
        input.click();
    }
}

// Handle selected image
function displayImage(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];

    // ✅ Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification("File size must be less than 5MB", "error");
        input.value = "";
        return;
    }

    // ✅ Validate file type
    if (!file.type.startsWith("image/")) {
        showNotification("Please select a valid image file", "error");
        input.value = "";
        return;
    }

    // ✅ Show preview instantly
    const reader = new FileReader();
    reader.onload = function (e) {
        const profileDisplay = document.getElementById("profileDisplay");
        if (profileDisplay) {
            profileDisplay.src = e.target.result;
            showImageUploadProgress(true);
        }
    };
    reader.readAsDataURL(file);

    // ✅ Upload to server
    uploadProfileImage(file);
}


// Show upload progress
function showImageUploadProgress(show) {
    const avatar = document.querySelector('.avatar');
    let overlay = avatar.querySelector('.upload-overlay');
    
    if (show) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'upload-overlay';
            overlay.innerHTML = `
                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                           background: rgba(0,0,0,0.7); border-radius: 50%; 
                           display: flex; align-items: center; justify-content: center; 
                           color: white; font-size: 12px; z-index: 10;">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span style="margin-left: 8px;">Uploading...</span>
                </div>
            `;
            avatar.appendChild(overlay);
        }
    } else {
        if (overlay) {
            overlay.remove();
        }
    }
}

// Upload profile image to server
async function uploadProfileImage(file) {
    try {
        const formData = new FormData();
        formData.append('profileImage', file);
        
        const res = await fetch("http://localhost:5000/api/profile/upload-image", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showNotification("Profile picture updated successfully!", "success");
            addToActivity("Updated profile picture", "profile");
            
            // Update the stored user data
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            currentUser.profileImage = data.imageUrl;
            localStorage.setItem("user", JSON.stringify(currentUser));
            
            // Update the profile display with the server URL
            const profileDisplay = document.querySelector('#profileDisplay');
            if (profileDisplay) {
                profileDisplay.src = `http://localhost:5000${data.imageUrl}`;
            }
            
            // Add success animation
            const avatar = document.querySelector('.avatar');
            avatar.style.animation = 'successPulse 0.6s ease';
            setTimeout(() => {
                avatar.style.animation = '';
            }, 600);
            
            // Trigger storage event to notify other tabs/windows
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'user',
                newValue: JSON.stringify(currentUser)
            }));
        } else {
            showNotification(data.message || "Failed to upload image", "error");
            // Revert to previous image on error
            loadPassport();
        }
    } catch (err) {
        console.error("Image upload error:", err);
        showNotification("Failed to upload image. Please try again.", "error");
        // Revert to previous image on error
        loadPassport();
    } finally {
        showImageUploadProgress(false);
    }
}

// Add success animation keyframes to document
function addSuccessAnimation() {
    if (!document.getElementById('success-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'success-animation-styles';
        style.textContent = `
            @keyframes successPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); box-shadow: 0 0 30px rgba(0, 230, 118, 0.8); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', function() {
    addSuccessAnimation();
});

// Add to activity
function addToActivity(description, type) {
    try {
        const activities = JSON.parse(localStorage.getItem('recentActivities') || '[]');
        activities.unshift({
            description,
            type,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 activities
        if (activities.length > 50) {
            activities.splice(50);
        }
        
        localStorage.setItem('recentActivities', JSON.stringify(activities));
        loadRecentActivity();
    } catch (err) {
        console.error("Error adding activity:", err);
    }
}

// Utility functions
function getActivityIcon(type) {
    const icons = {
        expense: 'fas fa-receipt',
        settlement: 'fas fa-handshake',
        invite: 'fas fa-user-plus',
        export: 'fas fa-download',
        group: 'fas fa-users',
        profile: 'fas fa-user-edit'
    };
    return icons[type] || 'fas fa-info-circle';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
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
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #00e676, #43cea2)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #ff5252, #dd2476)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #2196f3, #21cbf3)';
    }
    
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}