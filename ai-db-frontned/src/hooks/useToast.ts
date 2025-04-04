// src/hooks/useToast.ts
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { addToast, removeToast } from '../store/slices/uiSlice';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export const useToast = () => {
  const dispatch = useAppDispatch();
  const { toasts } = useAppSelector(state => state.ui);
  
  const showToast = useCallback((
    message: string, 
    type: ToastType = 'info', 
    duration: number = 5000
  ) => {
    const id = dispatch(addToast({ type, message, duration })).payload.id;
    
    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        dispatch(removeToast(id));
      }, duration);
    }
    
    return id;
  }, [dispatch]);
  
  const dismissToast = useCallback((id: string) => {
    dispatch(removeToast(id));
  }, [dispatch]);
  
  const success = useCallback((message: string, duration?: number) => {
    return showToast(message, 'success', duration);
  }, [showToast]);
  
  const error = useCallback((message: string, duration?: number) => {
    return showToast(message, 'error', duration);
  }, [showToast]);
  
  const info = useCallback((message: string, duration?: number) => {
    return showToast(message, 'info', duration);
  }, [showToast]);
  
  const warning = useCallback((message: string, duration?: number) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);
  
  return {
    toasts,
    showToast,
    dismissToast,
    success,
    error,
    info,
    warning
  };
};

export default useToast;