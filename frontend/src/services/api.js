import axios from 'axios';

class APIService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Interceptor cho request
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor cho response
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Các phương thức xác thực
  async register(data) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(data) {
    const response = await this.client.post('/auth/login', data);
    return response.data;
  }

  async googleLogin(credential) {
    const response = await this.client.post('/auth/google', { credential });
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/auth/logout');
    return response.data;
  }

  async getMe() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async updateProfile(data) {
    const response = await this.client.put('/auth/profile', data);
    return response.data;
  }

  async uploadAvatar(formData) {
    const response = await this.client.post('/auth/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async changePassword(data) {
    const response = await this.client.put('/auth/password', data);
    return response.data;
  }

  // 2FA methods
  async validate2FALogin(data) {
    const response = await this.client.post('/auth/2fa/validate-login', data);
    return response.data;
  }

  async setup2FA() {
    const response = await this.client.post('/auth/2fa/setup');
    return response.data;
  }

  async verify2FA(code) {
    const response = await this.client.post('/auth/2fa/verify', { token: code });
    return response.data;
  }

  async disable2FA(password) {
    const response = await this.client.post('/auth/2fa/disable', { password });
    return response.data;
  }

  async regenerateBackupCodes(password) {
    const response = await this.client.post('/auth/2fa/regenerate-backup-codes', { password });
    return response.data;
  }

  async get2FAStatus() {
    const response = await this.client.get('/auth/2fa/status');
    return response.data;
  }

  // Các phương thức quản lý user
  async getAllUsers(params = {}) {
    const response = await this.client.get('/users', { params });
    return response.data;
  }

  async getUserById(id) {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  async searchUsers(query) {
    const response = await this.client.get('/users/search', { params: { query } });
    return response.data;
  }

  async updateUser(id, data) {
    const response = await this.client.put(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id) {
    const response = await this.client.delete(`/users/${id}`);
    return response.data;
  }

  async getOnlineUsers() {
    const response = await this.client.get('/users/online');
    return response.data;
  }

  // Các phương thức quản lý bạn bè
  async sendFriendRequest(recipientId) {
    const response = await this.client.post('/friends/request', { recipientId });
    return response.data;
  }

  async getFriendRequests() {
    const response = await this.client.get('/friends/requests');
    return response.data;
  }

  async acceptFriendRequest(requestId) {
    const response = await this.client.post(`/friends/request/${requestId}/accept`);
    return response.data;
  }

  async rejectFriendRequest(requestId) {
    const response = await this.client.post(`/friends/request/${requestId}/reject`);
    return response.data;
  }

  async getFriends() {
    const response = await this.client.get('/friends');
    return response.data;
  }

  async removeFriend(friendId) {
    const response = await this.client.delete(`/friends/${friendId}`);
    return response.data;
  }

  // Block/Restrict methods
  async blockUser(userId) {
    const response = await this.client.post(`/friends/users/${userId}/block`);
    return response.data;
  }

  async unblockUser(userId) {
    const response = await this.client.delete(`/friends/users/${userId}/block`);
    return response.data;
  }

  async restrictUser(userId) {
    const response = await this.client.post(`/friends/users/${userId}/restrict`);
    return response.data;
  }

  async unrestrictUser(userId) {
    const response = await this.client.delete(`/friends/users/${userId}/restrict`);
    return response.data;
  }

  async getBlockedUsers() {
    const response = await this.client.get('/friends/blocked');
    return response.data;
  }

  async getRestrictedUsers() {
    const response = await this.client.get('/friends/restricted');
    return response.data;
  }

  async checkStatusVisibility(userId) {
    const response = await this.client.get(`/friends/users/${userId}/status-visibility`);
    return response.data;
  }

  // Conversation actions
  async togglePinConversation(conversationId) {
    const response = await this.client.post(`/friends/conversations/${conversationId}/pin`);
    return response.data;
  }

  async deleteConversation(conversationId) {
    const response = await this.client.delete(`/friends/conversations/${conversationId}`);
    return response.data;
  }

  async reportUser(reportedUserId, reason, description = '') {
    const response = await this.client.post('/notifications/report', { reportedUserId, reason, description });
    return response.data;
  }

  // Các phương thức quản lý cuộc trò chuyện
  async getConversations() {
    const response = await this.client.get('/friends/conversations');
    return response.data;
  }

  async createConversation(participantId) {
    const response = await this.client.post('/friends/conversations', { participantId });
    return response.data;
  }

  async createGroup(data) {
    const response = await this.client.post('/friends/groups', data);
    return response.data;
  }

  // Các phương thức quản lý tin nhắn
  async sendMessage(data) {
    const response = await this.client.post('/messages', data);
    return response.data;
  }

  async sendMessageWithFile(formData) {
    const response = await this.client.post('/messages', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async getMessages(conversationId, params = {}) {
    const response = await this.client.get(`/messages/conversation/${conversationId}`, { params });
    return response.data;
  }

  async markMessageAsRead(messageId) {
    const response = await this.client.put(`/messages/${messageId}/read`);
    return response.data;
  }

  async deleteMessage(messageId) {
    const response = await this.client.delete(`/messages/${messageId}`);
    return response.data;
  }

  async getAllMessages(params = {}) {
    const response = await this.client.get('/messages/admin/all', { params });
    return response.data;
  }

  // Notification methods
  async getNotifications(params = {}) {
    const response = await this.client.get('/notifications', { params });
    return response.data;
  }

  async getUnreadNotificationCount() {
    const response = await this.client.get('/notifications/unread-count');
    return response.data;
  }

  async markNotificationAsRead(notificationId) {
    const response = await this.client.put(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.put('/notifications/mark-all-read');
    return response.data;
  }

  async deleteNotification(notificationId) {
    const response = await this.client.delete(`/notifications/${notificationId}`);
    return response.data;
  }

  async clearAllNotifications() {
    const response = await this.client.delete('/notifications');
    return response.data;
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new APIService();
