// src/utils/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add timestamp for cache busting if needed
    if (config.method === 'get' && config.cacheBust) {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.error(`❌ API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} - ${error.response?.status || 'Network Error'}`);
    
    // Handle different error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            localStorage.removeItem('token');
            
            // Only show toast if not already on login page
            if (!window.location.pathname.includes('/login')) {
              toast.error('Session expired. Please login again.');
              window.location.href = '/login';
            }
          }
          break;
          
        case 403:
          toast.error('Access denied. You don\'t have permission for this action.');
          break;
          
        case 404:
          toast.error('Resource not found.');
          break;
          
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
          
        case 500:
          toast.error('Server error. Please try again later.');
          break;
          
        case 503:
          toast.error('Service temporarily unavailable.');
          break;
          
        default:
          // Show specific error message from server if available
          const message = data?.message || `Request failed with status ${status}`;
          toast.error(message);
      }
    } else if (error.request) {
      // Network error
      if (!navigator.onLine) {
        toast.error('You appear to be offline. Please check your connection.');
      } else {
        toast.error('Network error. Please check your connection.');
      }
    } else {
      // Other errors
      toast.error('An unexpected error occurred.');
    }
    
    return Promise.reject(error);
  }
);

// API utility functions
export const apiUtils = {
  // Generic GET request with caching support
  get: async (url, options = {}) => {
    try {
      const response = await api.get(url, options);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generic POST request
  post: async (url, data, options = {}) => {
    try {
      const response = await api.post(url, data, options);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generic PUT request
  put: async (url, data, options = {}) => {
    try {
      const response = await api.put(url, data, options);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generic DELETE request
  delete: async (url, options = {}) => {
    try {
      const response = await api.delete(url, options);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // File upload with progress
  uploadFile: async (url, formData, onProgress) => {
    try {
      const response = await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: onProgress
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Retry mechanism for failed requests
  retry: async (requestFn, maxRetries = 3, delay = 1000) => {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError;
  }
};

// Specific API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  uploadAvatar: (formData) => api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password })
};

export const issuesAPI = {
  getAll: (params) => api.get('/issues', { params }),
  getNearby: (params) => api.get('/issues/nearby', { params }),
  getById: (id) => api.get(`/issues/${id}`),
  create: (formData) => api.post('/issues', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/issues/${id}`, data),
  delete: (id) => api.delete(`/issues/${id}`),
  addComment: (id, comment) => api.post(`/issues/${id}/comments`, comment),
  upvote: (id) => api.post(`/issues/${id}/upvote`),
  getMyIssues: (params) => api.get('/issues/my/issues', { params }),
  getStats: () => api.get('/issues/stats/overview'),
  search: (params) => api.get('/issues/search/text', { params })
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getPendingIssues: (params) => api.get('/admin/issues/pending', { params }),
  updateIssueStatus: (id, data) => api.put(`/admin/issues/${id}/status`, data),
  bulkUpdateIssues: (data) => api.post('/admin/issues/bulk', data),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  exportData: (params) => api.get('/admin/export', { params }),
  sendAnnouncement: (data) => api.post('/admin/announcement', data),
  getSystemHealth: () => api.get('/admin/system/health')
};

export const authoritiesAPI = {
  getAll: (params) => api.get('/authorities', { params }),
  getById: (id) => api.get(`/authorities/${id}`),
  create: (data) => api.post('/authorities', data),
  update: (id, data) => api.put(`/authorities/${id}`, data),
  delete: (id) => api.delete(`/authorities/${id}`),
  getIssues: (id, params) => api.get(`/authorities/${id}/issues`, { params }),
  updateIssueStatus: (id, issueId, data) => api.put(`/authorities/${id}/issues/${issueId}`, data),
  getMetrics: (id, params) => api.get(`/authorities/${id}/metrics`, { params }),
  getByDepartment: (department) => api.get(`/authorities/department/${department}`),
  findByLocation: (data) => api.post('/authorities/find-by-location', data),
  getStats: () => api.get('/authorities/stats/overview')
};

export const leaderboardAPI = {
  getMonthly: (params) => api.get('/leaderboard/monthly', { params }),
  getYearly: (params) => api.get('/leaderboard/yearly', { params }),
  getByCategory: (params) => api.get('/leaderboard/category', { params }),
  getUserHistory: (userId, params) => api.get(`/leaderboard/user/${userId}`, { params }),
  getStats: () => api.get('/leaderboard/stats'),
  getAchievements: () => api.get('/leaderboard/achievements'),
  getImpact: (params) => api.get('/leaderboard/impact', { params })
};

export default api;