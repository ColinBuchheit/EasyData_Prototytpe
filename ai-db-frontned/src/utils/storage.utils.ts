// src/utils/storage.utils.ts

/**
 * Get an item from localStorage with proper typing and error handling
 */
export const getLocalStorageItem = <T>(key: string, defaultValue: T | null = null): T | null => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error getting item ${key} from localStorage:`, error);
      return defaultValue;
    }
  };
  
  /**
   * Set an item in localStorage with error handling
   */
  export const setLocalStorageItem = <T>(key: string, value: T): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error storing item ${key} in localStorage:`, error);
      return false;
    }
  };
  
  /**
   * Remove an item from localStorage
   */
  export const removeLocalStorageItem = (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item ${key} from localStorage:`, error);
      return false;
    }
  };
  
  /**
   * Clear all items from localStorage
   */
  export const clearLocalStorage = (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  };
  
  /**
   * Store user preferences in localStorage
   */
  export const storeUserPreferences = (preferences: any): boolean => {
    return setLocalStorageItem('user_preferences', preferences);
  };
  
  /**
   * Get user preferences from localStorage
   */
  export const getUserPreferences = (): any => {
    return getLocalStorageItem('user_preferences', {});
  };
  
  /**
   * Store query history in localStorage
   */
  export const storeQueryHistory = (queries: any[]): boolean => {
    // Limit the number of stored queries to prevent localStorage overflow
    const limitedQueries = queries.slice(0, 50);
    return setLocalStorageItem('query_history', limitedQueries);
  };
  
  /**
   * Get query history from localStorage
   */
  export const getQueryHistory = (): any[] => {
    return getLocalStorageItem('query_history', []) || [];
  };
  
  /**
   * Store chat sessions in localStorage
   */
  export const storeChatSessions = (sessions: any[]): boolean => {
    // Limit the number of stored sessions
    const limitedSessions = sessions.slice(0, 20);
    return setLocalStorageItem('chat_sessions', limitedSessions);
  };
  
  /**
   * Get chat sessions from localStorage
   */
  export const getChatSessions = (): any[] => {
    return getLocalStorageItem('chat_sessions', []) || [];
  };
  
  /**
   * Check if localStorage is available
   */
  export const isLocalStorageAvailable = (): boolean => {
    try {
      const testKey = '__test_storage__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  /**
   * Get current storage usage statistics
   */
  export const getStorageStats = (): { used: number; total: number; percentage: number } => {
    try {
      let totalSize = 0;
      let available = 5 * 1024 * 1024; // Assuming 5MB default
      
      // Calculate current usage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          totalSize += key.length + value.length;
        }
      }
      
      // Convert to MB for readability
      const usedMB = totalSize / (1024 * 1024);
      const totalMB = available / (1024 * 1024);
      const percentage = (totalSize / available) * 100;
      
      return {
        used: usedMB,
        total: totalMB,
        percentage
      };
    } catch (error) {
      console.error('Error calculating storage stats:', error);
      return {
        used: 0,
        total: 5, // 5MB default
        percentage: 0
      };
    }
  };