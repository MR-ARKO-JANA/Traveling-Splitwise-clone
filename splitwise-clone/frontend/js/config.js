// Configuration file for Splitwise Clone Frontend

// API Base URL
const API_BASE_URL = "http://localhost:5000";

// API Endpoints
const API_ENDPOINTS = {
    auth: {
        login: `${API_BASE_URL}/api/auth/login`,
        register: `${API_BASE_URL}/api/auth/register`
    },
    groups: {
        base: `${API_BASE_URL}/api/groups`,
        addMember: `${API_BASE_URL}/api/groups/add-member`
    },
    expenses: {
        base: `${API_BASE_URL}/api/expenses`
    },
    balance: {
        summary: `${API_BASE_URL}/api/balance/summary`
    },
    profile: {
        passport: `${API_BASE_URL}/api/profile/passport`,
        update: `${API_BASE_URL}/api/profile/update`,
        uploadImage: `${API_BASE_URL}/api/profile/upload-image`
    }
};

// Default headers for API requests
function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

// Utility function to check if user is authenticated
function isAuthenticated() {
    return !!localStorage.getItem("token");
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = "index.html";
        return false;
    }
    return true;
}

// Global error handler for API responses
async function handleApiResponse(response) {
    if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "index.html";
        return null;
    }
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_BASE_URL,
        API_ENDPOINTS,
        getAuthHeaders,
        isAuthenticated,
        requireAuth,
        handleApiResponse
    };
}