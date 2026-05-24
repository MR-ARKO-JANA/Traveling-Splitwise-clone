const userService = {
  async getPassport() {
    return await apiClient.get('/api/profile/passport');
  },

  async updateProfile(profileData) {
    return await apiClient.put('/api/profile/update', profileData);
  },

  async uploadProfileImage(formData) {
    // We use fetch directly here because apiClient.post expects JSON by default
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/profile/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Upload failed');
    }
    return await res.json();
  },

  async getActivity() {
    return await apiClient.get('/api/profile/activity');
  },
};
