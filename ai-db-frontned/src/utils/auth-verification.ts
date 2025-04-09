import { store } from '../store';
import { setUser, logout } from '../store/slices/authSlice';
import { getToken, isTokenExpired } from '../utils/auth.utils';
import apiClient from '../api';

export const verifyAuthOnStartup = async (): Promise<boolean> => {
  const token = getToken();
  
  if (!token) {
    store.dispatch(logout());
    return false;
  }
  
  if (isTokenExpired(token)) {
    store.dispatch(logout());
    return false;
  }
  
  try {
    // Verify token with backend
    const response = await apiClient.get('/auth/verify');
    
    if (response.data && response.data.user) {
      store.dispatch(setUser(response.data.user));
      return true;
    } else {
      store.dispatch(logout());
      return false;
    }
  } catch (error) {
    console.error('Auth verification error:', error);
    store.dispatch(logout());
    return false;
  }
};
