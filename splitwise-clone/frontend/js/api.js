// API Service Layer
// Depends on config.js being loaded before this file

const api = {
    auth: {
        login: async (email, password) => {
            const res = await fetch(API_ENDPOINTS.auth.login, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            return handleApiResponse(res);
        },
        signup: async (name, email, password) => {
            const res = await fetch(API_ENDPOINTS.auth.signup, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });
            return handleApiResponse(res);
        },
        forgotPassword: async (email) => {
            const res = await fetch(API_ENDPOINTS.auth.forgotPassword, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
                throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
            }
            return res.json();
        },
        verifyOtp: async (email, otp, token) => {
            const res = await fetch(API_ENDPOINTS.auth.verifyOtp, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp, token })
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
                throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
            }
            return res.json();
        },
        resetPassword: async (email, newPassword, token) => {
            const res = await fetch(API_ENDPOINTS.auth.resetPassword, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, newPassword, token })
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
                throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
            }
            return res.json();
        }
    },
    groups: {
        getAll: async () => {
            const res = await fetch(API_ENDPOINTS.groups.base, {
                headers: getAuthHeaders()
            });
            return handleApiResponse(res);
        },
        create: async (name, description, emails) => {
            const res = await fetch(API_ENDPOINTS.groups.base, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ name, description, emails })
            });
            return handleApiResponse(res);
        },
        addMember: async (groupId, email) => {
            const res = await fetch(API_ENDPOINTS.groups.addMember, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ groupId, email })
            });
            return handleApiResponse(res);
        },
        delete: async (groupId) => {
            const res = await fetch(`${API_ENDPOINTS.groups.base}/${groupId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            return handleApiResponse(res);
        }
    },
    expenses: {
        getByGroup: async (groupId) => {
            const res = await fetch(`${API_ENDPOINTS.expenses.base}/${groupId}`, {
                headers: getAuthHeaders()
            });
            return handleApiResponse(res);
        },
        create: async (data) => {
            // data = { description, amount, groupId, category, splitType, splitDetails, notes, currency }
            const res = await fetch(API_ENDPOINTS.expenses.base, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleApiResponse(res);
        },
        update: async (expenseId, data) => {
            const res = await fetch(`${API_ENDPOINTS.expenses.base}/${expenseId}`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleApiResponse(res);
        },
        delete: async (expenseId) => {
            const res = await fetch(`${API_ENDPOINTS.expenses.base}/${expenseId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            return handleApiResponse(res);
        },
        getHistory: async (page = 1, limit = 20, category = "all") => {
            let url = `${API_ENDPOINTS.expenses.base}/history/user?page=${page}&limit=${limit}`;
            if (category && category !== "all") url += `&category=${category}`;
            const res = await fetch(url, { headers: getAuthHeaders() });
            return handleApiResponse(res);
        },
        getStats: async (groupId) => {
            const res = await fetch(`${API_ENDPOINTS.expenses.base}/stats/${groupId}`, {
                headers: getAuthHeaders()
            });
            return handleApiResponse(res);
        }
    },
    balances: {
        getSummary: async () => {
            const res = await fetch(API_ENDPOINTS.balance.summary, {
                headers: getAuthHeaders()
            });
            return handleApiResponse(res);
        },
        getDetails: async () => {
            const res = await fetch(`${API_BASE_URL}/api/balance/details`, {
                headers: getAuthHeaders()
            });
            return handleApiResponse(res);
        },
        simplifyDebts: async (groupId) => {
            const res = await fetch(`${API_BASE_URL}/api/balance/simplify/${groupId}`, {
                headers: getAuthHeaders()
            });
            return handleApiResponse(res);
        },
        settle: async (withUserId, amount) => {
            const res = await fetch(`${API_BASE_URL}/api/balance/settle`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ withUserId, amount })
            });
            return handleApiResponse(res);
        },
        getSettlements: async () => {
            const res = await fetch(`${API_BASE_URL}/api/balance/settlements`, {
                headers: getAuthHeaders()
            });
            return handleApiResponse(res);
        }
    },
    activity: {
        getFeed: async (page = 1, limit = 30) => {
            const res = await fetch(`${API_BASE_URL}/api/activity?page=${page}&limit=${limit}`, {
                headers: getAuthHeaders()
            });
            return handleApiResponse(res);
        },
        getGroupFeed: async (groupId, page = 1, limit = 30) => {
            const res = await fetch(`${API_BASE_URL}/api/activity/group/${groupId}?page=${page}&limit=${limit}`, {
                headers: getAuthHeaders()
            });
            return handleApiResponse(res);
        }
    },
    export: {
        downloadGroupCSV: (groupId) => {
            const token = localStorage.getItem("token");
            window.open(`${API_BASE_URL}/api/export/csv/${groupId}?token=${token}`, "_blank");
        },
        downloadAllCSV: () => {
            const token = localStorage.getItem("token");
            window.open(`${API_BASE_URL}/api/export/csv/user/all?token=${token}`, "_blank");
        }
    },
    profile: {
        getPassport: async () => {
            const res = await fetch(`${API_BASE_URL}/api/profile/passport`, {
                headers: getAuthHeaders()
            });
            return handleApiResponse(res);
        }
    }
};
