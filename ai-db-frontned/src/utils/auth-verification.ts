// src/utils/auth-verification.ts
import { store } from '../store';
import { setUser, logout as logoutAction } from '../store/slices/authSlice';
import apiClient from '../api';
import * as AuthUtils from './auth-utils';

/**
 * Verifies authentication on application startup
 * Returns true if authentication is valid, false otherwise
 */
export const verifyAuthOnStartup = async (): Promise<boolean> => {
  // Get token from storage
  const token = AuthUtils.getToken();
  
  // If no token exists, clear any potential stale state and return false
  if (!token) {
    AuthUtils.clearTokens();
    store.dispatch(setUser(null));
    return false;
  }
  
  // If token is expired, check for refresh token
  if (AuthUtils.isTokenExpired(token)) {
    const refreshToken = AuthUtils.getRefreshToken();
    if (refreshToken) {
      // Try to refresh the token
      const refreshed = await tryRefreshToken(refreshToken);
      if (refreshed) {
        return true;
      }
    }
    
    // If refresh failed or no refresh token, clear tokens and return false
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

/**
 * Attempt to refresh the token using a refresh token
 * Returns true if token was refreshed successfully
 */
const tryRefreshToken = async (refreshToken: string): Promise<boolean> => {
  try {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    
    if (response.data && response.data.success && response.data.token) {
      // Update tokens and user
      AuthUtils.clearTokens(); // Clear old tokens first
      AuthUtils.setToken(response.data.token);
      
      if (response.data.refreshToken) {
        AuthUtils.setRefreshToken(response.data.refreshToken);
      }
      
      if (response.data.user) {
        store.dispatch(setUser(response.data.user));
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
};

/**
 * Safer logout function that ensures tokens are cleared even if API call fails
 */
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

/**
 * Verify token specifically for WebSocket connections
 * Returns true if token is valid, false otherwise
 * This is a simplified check that doesn't hit the server
 */
export const verifyTokenForWebsocket = AuthUtils.verifyTokenForWebsocket;
