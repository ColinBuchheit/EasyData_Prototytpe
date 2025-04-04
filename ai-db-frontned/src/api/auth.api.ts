// src/api/auth.api.ts
import apiClient from './index';
import { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse,
  PasswordResetRequest,
  TokenValidationRequest 
} from '../types/auth.types';

export const authApi = {
  // Login user
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },
  
  // Register new user
  register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },
  
  // Logout user
  logout: async (): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
  
  // Request password reset
  requestPasswordReset: async (email: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/auth/request-reset', { email });
    return response.data;
  },
  
  // Validate reset token
  validateResetToken: async (token: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/auth/validate-token', { token });
    return response.data;
  },
  
  // Reset password with token
  resetPassword: async (data: PasswordResetRequest): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },
  
  // Change password (when already logged in)
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  }
};