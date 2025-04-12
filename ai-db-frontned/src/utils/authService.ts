// src/utils/authService.ts
import { store } from '../store';
import { setUser, logout as logoutAction } from '../store/slices/authSlice';
import apiClient from '../api';
import * as AuthUtils from './auth-utils';

// Re-export token utilities from auth-utils
export const getToken = AuthUtils.getToken;
export const getRefreshToken = AuthUtils.getRefreshToken;
export const setToken = AuthUtils.setToken;
export const setRefreshToken = AuthUtils.setRefreshToken;
export const clearTokens = AuthUtils.clearTokens;
export const parseToken = AuthUtils.parseToken;
export const isTokenExpired = AuthUtils.isTokenExpired;
export const isAuthenticated = AuthUtils.isAuthenticated;

// Auth Verification
export const verifyAuthOnStartup = async (): Promise<boolean> => {
  // Get token from storage
  const token = AuthUtils.getToken();
  
  // If no token exists, clear any potential stale state and return false
  if (!token) {
    AuthUtils.clearTokens();
    store.dispatch(setUser(null));
    return false;
  }
  
  // If token is expired, clear tokens and return false
  if (AuthUtils.isTokenExpired(token)) {
    AuthUtils.clearTokens();
    store.dispatch(setUser(null));
    return false;
  }
  
  try {
    // Make a request to verify endpoint
    const response = await apiClient.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data && response.data.success && response.data.user) {
      // Valid auth - set user in store
      store.dispatch(setUser(response.data.user));
      return true;
    } else {
      // Invalid auth response - clear tokens silently
      AuthUtils.clearTokens();
      store.dispatch(setUser(null));
      return false;
    }
  } catch (error) {
    // Request failed - clear tokens silently
    console.error('Auth verification failed:', error);
    AuthUtils.clearTokens();
    store.dispatch(setUser(null));
    return false;
  }
};

// Logout
export const logout = async (): Promise<boolean> => {
  try {
    // Clear tokens first to prevent additional calls
    AuthUtils.clearTokens();
    
    // Then try to notify server (but don't wait for response)
    await apiClient.post('/auth/logout').catch(() => {
      // Ignore errors - we're already logging out
    });
    
    // Update Redux state
    store.dispatch(setUser(null));
    store.dispatch(logoutAction());
    
    return true;
  } catch (error) {
    // Ensure tokens and state are cleared regardless of API error
    AuthUtils.clearTokens();
    store.dispatch(setUser(null));
    store.dispatch(logoutAction());
    return false;
  }
};

export const safeLogout = (): void => {
  const token = AuthUtils.getToken();
  
  // Only try to call logout API if we have a token
  if (token) {
    // Clear tokens first to prevent additional calls
    AuthUtils.clearTokens();
    
    // Then try to notify server (but don't wait for response)
    apiClient.post('/auth/logout').catch(() => {
      // Ignore errors - we're already logging out
    });
  } else {
    // Just clear local state if no token
    AuthUtils.clearTokens();
  }
  
  // Always update Redux state regardless of API call
  store.dispatch(setUser(null));
  store.dispatch(logoutAction());
};
