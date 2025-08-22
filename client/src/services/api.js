import axios from 'axios';

// Fallback to production URLs if environment variables are not working
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname.includes('vercel.app') 
    ? 'https://chatstack-aviks-projects-f1605f5d.vercel.app/api'
    : 'http://localhost:8080/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
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

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
  getProfile: (id) => api.get(`/users/profile/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  searchUsers: (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
  sendFriendRequest: (addresseeId) => api.post('/users/friend-request', { addresseeId }),
  respondToFriendRequest: (id, status) => api.put(`/users/friend-request/${id}`, { status }),
  getFriends: () => api.get('/users/friends'),
  getFriendRequests: () => api.get('/users/friend-requests'),
};

// Messages API
export const messagesAPI = {
  getDirectMessages: (userId) => api.get(`/messages/direct/${userId}`),
  getGroupMessages: (groupId) => api.get(`/messages/group/${groupId}`),
  sendDirectMessage: (data) => api.post('/messages/direct', data),
  sendGroupMessage: (data) => api.post('/messages/group', data),
  getConversations: () => api.get('/messages/conversations'),
};

// Groups API
export const groupsAPI = {
  createGroup: (data) => api.post('/groups', data),
  getGroups: () => api.get('/groups'),
  getGroup: (id) => api.get(`/groups/${id}`),
  addMember: (groupId, userId) => api.post(`/groups/${groupId}/members`, { userId }),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  updateGroup: (id, data) => api.put(`/groups/${id}`, data),
  leaveGroup: (id) => api.post(`/groups/${id}/leave`),
};

export default api;
