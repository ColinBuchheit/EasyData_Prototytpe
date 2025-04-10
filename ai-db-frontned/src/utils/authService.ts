// src/utils/authService.ts
import { store } from '../store';
import { setUser, logout as logoutAction } from '../store/slices/authSlice';
import apiClient from '../api';

// Token Management
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const setRefreshToken = (refreshToken: string): void => {
  localStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};

// Token Validation
export const parseToken = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = parseToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// Auth Verification
export const verifyAuthOnStartup = async (): Promise<boolean> => {
  // Get token from storage
  const token = getToken();
  
  // If no token exists, clear any potential stale state and return false
  if (!token) {
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

// Logout
export const logout = async (): Promise<boolean> => {
  try {
    // Clear tokens first to prevent additional calls
    clearTokens();
    
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
    clearTokens();
    store.dispatch(setUser(null));
    store.dispatch(logoutAction());
    return false;
  }
};

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
  store.dispatch(logoutAction());
};