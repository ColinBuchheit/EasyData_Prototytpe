// src/hooks/useAuth.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { login, logout, setUser } from '../store/slices/authSlice';
import { LoginRequest } from '../types/auth.types';
import { getToken } from '../utils/auth.utils';
import { addToast } from '../store/slices/uiSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading, error } = useAppSelector(state => state.auth);

  // Check for token on mount
  useEffect(() => {
    const token = getToken();
    if (token && !isAuthenticated && !user) {
      // If we have a token but no user, try to fetch the user
      // This could be expanded to include a fetchCurrentUser API call
      // For now, just set auth state based on token presence
      dispatch(setUser({ id: 0, username: '', email: '', role: 'user' }));
    }
  }, [dispatch, isAuthenticated, user]);

  const handleLogin = async (credentials: LoginRequest) => {
    try {
      const result = await dispatch(login(credentials)).unwrap();
      return result;
    } catch (error) {
      return { success: false, message: error };
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      dispatch(addToast({
        type: 'info',
        message: 'You have been logged out'
      }));
      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login: handleLogin,
    logout: handleLogout
  };
};

export default useAuth;