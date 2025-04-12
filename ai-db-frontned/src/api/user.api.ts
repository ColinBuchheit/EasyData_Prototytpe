// src/api/user.api.ts
import apiClient from './index';
import { 
  UserProfile, 
  UserProfileUpdateData,
  UserPreferences,
  UserPreferencesUpdateData 
} from '../types/user.types';

export const userApi = {
  // Get user profile
  getUserProfile: async (): Promise<{ success: boolean; data: UserProfile }> => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },
  
  // Update user profile
  updateUserProfile: async (profileData: UserProfileUpdateData): Promise<{ success: boolean; data: UserProfile }> => {
    const response = await apiClient.put('/users/profile', profileData);
    return response.data;
  },
  
  // Get user preferences
  getUserPreferences: async (): Promise<{ success: boolean; data: UserPreferences }> => {
    const response = await apiClient.get('/users/preferences');
    return response.data;
  },
  
  // Update user preferences
  updateUserPreferences: async (preferencesData: UserPreferencesUpdateData): Promise<{ success: boolean; data: UserPreferences }> => {
    const response = await apiClient.put('/users/preferences', preferencesData);
    return response.data;
  },
  
  // Reset user preferences to defaults
  resetUserPreferences: async (): Promise<{ success: boolean; data: UserPreferences }> => {
    const response = await apiClient.post('/users/preferences/reset');
    return response.data;
  }
};