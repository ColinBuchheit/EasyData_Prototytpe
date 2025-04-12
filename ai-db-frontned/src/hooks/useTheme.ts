// src/hooks/useTheme.ts
import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { setTheme } from '../store/slices/uiSlice';
import { UserTheme } from '../types/user.types';

export const useTheme = () => {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector(state => state.ui);
  
  // Apply theme to document
  useEffect(() => {
    // Get system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply theme based on settings or system preference
    if (theme === 'dark' || (theme === 'system' && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as UserTheme | null;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      dispatch(setTheme(savedTheme));
    }
  }, [dispatch]);
  
  // Listen for system preference changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        if (mediaQuery.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [theme]);
  
  const updateTheme = useCallback((newTheme: UserTheme) => {
    dispatch(setTheme(newTheme));
  }, [dispatch]);
  
  return {
    theme,
    updateTheme
  };
};

export default useTheme;