const balanceService = {
  async getSummary() {
    return await apiClient.get('/api/balance/summary');
  },

  async getDetails() {
    return await apiClient.get('/api/balance/details');
  },

  async settleDebt(settlementData) {
    return await apiClient.post('/api/balance/settle', settlementData);
  },

  async getSettlements() {
    return await apiClient.get('/api/balance/settlements');
  },
};
