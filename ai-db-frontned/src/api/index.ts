// src/api/index.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getToken, clearTokens } from '../utils/authService';

// Update the API URL to point to the correct backend endpoint
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/database';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor for adding token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request debugging for development
    if (import.meta.env.DEV) {
      console.log(`Request to ${config.url}:`, config.data);
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Add response debugging for development
    if (import.meta.env.DEV) {
      console.log(`Response from ${response.config.url}:`, response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Could implement token refresh here if needed
      // For now, just clear tokens and let the auth flow handle it
      clearTokens();
      window.location.href = '/login';
    }
    
    // Log API errors in development
    if (import.meta.env.DEV && error.response) {
      console.error(`API Error (${error.response.status}):`, error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;