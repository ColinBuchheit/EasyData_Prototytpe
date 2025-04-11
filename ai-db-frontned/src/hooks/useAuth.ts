// src/hooks/useAuth.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { login, logout, setUser } from '../store/slices/authSlice';
import { LoginRequest } from '../types/auth.types';
import { clearTokens, getToken } from '../utils/authService';
import { addToast } from '../store/slices/uiSlice';
import { authApi } from '../api/auth.api';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading, error } = useAppSelector(state => state.auth);

  useEffect(() => {
    const token = getToken();
    if (token && !isAuthenticated) {
      // Use async IIFE to properly handle the Promise
      (async () => {
        try {
          console.log("[AUTH DEBUG] Recovering user session from token");
          const userResponse = await authApi.getCurrentUser();
          
          if (userResponse.success && userResponse.user) {
            dispatch(setUser(userResponse.user));
            console.log("[AUTH DEBUG] User session recovered successfully");
          } else {
            console.log("[AUTH DEBUG] Token exists but couldn't recover user session");
            clearTokens();
          }
        } catch (error) {
          console.error("[AUTH DEBUG] Error recovering user session:", error);
          clearTokens();
        }
      })();
    }
  }, [dispatch, isAuthenticated]);

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