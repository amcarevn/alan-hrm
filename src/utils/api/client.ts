import axios from 'axios';
import type { AxiosInstance } from 'axios';

export const API_BASE_URL = 'https://alan-hrm.homiex.vn';
//export const API_BASE_URL = 'https://app-uat.amcare.vn';
//export const API_BASE_URL = 'http://localhost:8000';
// Create axios instance for Management API
export const managementApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ... rest of the file

// Request interceptor for Management API
managementApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for Management API with auto-refresh
managementApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          console.log('❌ No refresh token available');
          throw new Error('No refresh token available');
        }

        console.log('🔄 Attempting to refresh token...');

        // Call refresh endpoint (KHÔNG dùng managementApi để tránh loop)
        const { data } = await axios.post(`${API_BASE_URL}/api-hrm/users/token/refresh/`, {
          refresh: refreshToken,
        });

        console.log('✅ Token refreshed successfully');

        // Save new access token
        localStorage.setItem('accessToken', data.access);
        
        // Optional: Update refresh token if backend rotates it
        if (data.refresh) {
          localStorage.setItem('refreshToken', data.refresh);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return managementApi(originalRequest);
        
      } catch (refreshError) {
        // Refresh failed → Clear tokens and let ProtectedRoute handle redirect
        console.error('❌ Token refresh failed:', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Don't redirect here, let ProtectedRoute handle it
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
