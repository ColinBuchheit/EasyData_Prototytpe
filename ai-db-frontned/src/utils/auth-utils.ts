// src/utils/auth-utils.ts
// This file contains pure utility functions for auth that don't depend on Redux

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

/**
 * Verify token specifically for WebSocket connections
 * Returns true if token is valid, false otherwise
 * This is a simplified check that doesn't hit the server
 */
export const verifyTokenForWebsocket = (): boolean => {
  const token = getToken();
  
  if (!token) return false;
  if (isTokenExpired(token)) {
    clearTokens();
    return false;
  }
  
  try {
    // Simple verification without server call
    const decoded = parseToken(token);
    return !!decoded && !!decoded.sub;
  } catch (error) {
    console.error('Error verifying token for websocket:', error);
    return false;
  }
};
