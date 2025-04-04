// src/utils/auth.utils.ts

/**
 * Get the JWT token from localStorage
 */
export const getToken = (): string | null => {
    return localStorage.getItem('token');
  };
  
  /**
   * Get the refresh token from localStorage
   */
  export const getRefreshToken = (): string | null => {
    return localStorage.getItem('refreshToken');
  };
  
  /**
   * Store JWT token in localStorage
   */
  export const setToken = (token: string): void => {
    localStorage.setItem('token', token);
  };
  
  /**
   * Store refresh token in localStorage
   */
  export const setRefreshToken = (refreshToken: string): void => {
    localStorage.setItem('refreshToken', refreshToken);
  };
  
  /**
   * Clear all authentication tokens from localStorage
   */
  export const clearTokens = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };
  
  /**
   * Check if the user is authenticated
   */
  export const isAuthenticated = (): boolean => {
    return !!getToken();
  };
  
  /**
   * Parse JWT token to extract user info and expiration
   */
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
  
  /**
   * Check if the token is expired
   */
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