// src/components/common/ToastContainer.tsx

import React from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { removeToast } from '../../store/slices/uiSlice';

const Toast: React.FC = () => {
  const dispatch = useAppDispatch();
  const { toasts } = useAppSelector(state => state.ui);

  const handleDismiss = (id: string) => {
    dispatch(removeToast(id));
  };

  // If no toasts, don't render anything
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 p-4 space-y-4 z-50">
      {toasts.map(toast => {
        let bgColor, textColor, iconColor;
        
        switch (toast.type) {
          case 'success':
            bgColor = 'bg-green-100 dark:bg-green-800';
            textColor = 'text-green-800 dark:text-green-100';
            iconColor = 'text-green-500 dark:text-green-300';
            break;
          case 'error':
            bgColor = 'bg-red-100 dark:bg-red-800';
            textColor = 'text-red-800 dark:text-red-100';
            iconColor = 'text-red-500 dark:text-red-300';
            break;
          case 'warning':
            bgColor = 'bg-yellow-100 dark:bg-yellow-800';
            textColor = 'text-yellow-800 dark:text-yellow-100';
            iconColor = 'text-yellow-500 dark:text-yellow-300';
            break;
          case 'info':
          default:
            bgColor = 'bg-blue-100 dark:bg-blue-800';
            textColor = 'text-blue-800 dark:text-blue-100';
            iconColor = 'text-blue-500 dark:text-blue-300';
        }

        return (
          <div
            key={toast.id}
            className={`${bgColor} p-4 rounded-lg shadow-lg flex items-start max-w-md transform transition-all duration-300 ease-in-out translate-x-0`}
          >
            <div className={`flex-shrink-0 ${iconColor}`}>
              {toast.type === 'success' && (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {toast.type === 'warning' && (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className={`ml-3 ${textColor}`}>
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => handleDismiss(toast.id)}
                  className={`inline-flex ${textColor} rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Toast;