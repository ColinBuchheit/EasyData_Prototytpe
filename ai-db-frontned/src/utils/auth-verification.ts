// src/utils/auth-verification.ts
import { store } from '../store';
import { setUser, logout } from '../store/slices/authSlice';
import { getToken, isTokenExpired, clearTokens } from './auth.utils';
import apiClient from '../api';

/**
 * Verify authentication on startup
 * Returns a promise that resolves to true if authentication is valid
 */
export const verifyAuthOnStartup = async (): Promise<boolean> => {
  // Get token from storage
  const token = getToken();
  
  // If no token exists, clear any potential stale state and return false
  if (!token) {
    // Silently clear tokens without triggering API calls
    clearTokens();
    store.dispatch(setUser(null));
    return false;
  }
  
  // If token is expired, clear tokens and return false
  if (isTokenExpired(token)) {
    clearTokens();
    store.dispatch(setUser(null));
    return false;
  }
  
  try {
    // Make a request to verify endpoint (adjust to your actual endpoint)
    const response = await apiClient.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data && response.data.success && response.data.user) {
      // Valid auth - set user in store
      store.dispatch(setUser(response.data.user));
      return true;
    } else {
      // Invalid auth response - clear tokens silently
      clearTokens();
      store.dispatch(setUser(null));
      return false;
    }
  } catch (error) {
    // Request failed - clear tokens silently
    console.error('Auth verification failed:', error);
    clearTokens();
    store.dispatch(setUser(null));
    return false;
  }
};

/**
 * Safely handle logout without causing API calls when not authenticated
 */
export const safeLogout = (): void => {
  const token = getToken();
  
  // Only try to call logout API if we have a token
  if (token) {
    // Clear tokens first to prevent additional calls
    clearTokens();
    
    // Then try to notify server (but don't wait for response)
    apiClient.post('/auth/logout').catch(() => {
      // Ignore errors - we're already logging out
    });
  } else {
    // Just clear local state if no token
    clearTokens();
  }
  
  // Always update Redux state regardless of API call
  store.dispatch(setUser(null));
};