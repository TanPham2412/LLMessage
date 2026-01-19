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

    // Request interceptor
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

    // Response interceptor
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

  // Auth methods
  async register(data) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(data) {
    const response = await this.client.post('/auth/login', data);
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

  async changePassword(data) {
    const response = await this.client.put('/auth/password', data);
    return response.data;
  }

  // User methods
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

  // Friend methods
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

  // Conversation methods
  async getConversations() {
    const response = await this.client.get('/friends/conversations');
    return response.data;
  }

  async createConversation(participantId) {
    const response = await this.client.post('/friends/conversations', { participantId });
    return response.data;
  }

  // Message methods
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
}

export default new APIService();
