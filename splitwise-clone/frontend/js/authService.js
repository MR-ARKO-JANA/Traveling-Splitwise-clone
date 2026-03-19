const authService = {
    async login(email, password) {
        return await apiClient.post('/api/auth/login', { email, password }, false);
    },

    async signup(userData) {
        return await apiClient.post('/api/auth/signup', userData, false);
    },

    async forgotPassword(email) {
        return await apiClient.post('/api/auth/forgot-password', { email }, false);
    },

    async verifyOtp(email, otp) {
        return await apiClient.post('/api/auth/verify-otp', { email, otp }, false);
    },

    async resetPassword(email, otp, newPassword) {
        return await apiClient.post('/api/auth/reset-password', { email, otp, newPassword }, false);
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
};
