/**
 * Dashboard Service
 * Business logic and data fetching for the dashboard
 */
const dashboardService = {
    async getCurrentUser() {
        return userService.getPassport();
    },

    async getGroups() {
        return apiClient.get('/api/groups');
    },

    async getGroupExpenses(groupId) {
        return apiClient.get(`/api/expenses/${groupId}`);
    },

    async getBalanceSummary() {
        return balanceService.getSummary();
    },

    async createGroup(groupData) {
        return apiClient.post('/api/groups', groupData);
    },

    async deleteGroup(groupId) {
        return apiClient.delete(`/api/groups/${groupId}`);
    },

    async addExpense(expenseData) {
        return apiClient.post('/api/expenses', expenseData);
    },

    async deleteExpense(expenseId) {
        return apiClient.delete(`/api/expenses/${expenseId}`);
    },

    async inviteMember(groupId, email) {
        return apiClient.post('/api/groups/add-member', { groupId, email });
    }
};

window.dashboardService = dashboardService;
