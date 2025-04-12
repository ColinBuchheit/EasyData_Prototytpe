// src/utils/api-response.ts
import { ApiResponse } from '../types/api.types';
import { addToast } from '../store/slices/uiSlice';
import { store } from '../store';

/**
 * Standard API response handler
 */
export const handleApiResponse = async <T,>(
  apiCall: Promise<any>,
  options: {
    successMessage?: string;
    errorMessage?: string;
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
    defaultErrorMessage?: string;
  } = {}
): Promise<ApiResponse<T>> => {
  const {
    successMessage,
    errorMessage,
    showSuccessToast = false,
    showErrorToast = true,
    defaultErrorMessage = 'An error occurred. Please try again.'
  } = options;
  
  try {
    const response = await apiCall;
    
    // Check if the response is in the expected format
    if (response && response.data !== undefined) {
      // Handle success case
      if (response.data.success) {
        if (showSuccessToast && successMessage) {
          store.dispatch(addToast({
            type: 'success',
            message: successMessage
          }));
        }
        
        return response.data as ApiResponse<T>;
      } 
      // Handle error response with success = false
      else {
        const message = errorMessage || response.data.message || defaultErrorMessage;
        
        if (showErrorToast) {
          store.dispatch(addToast({
            type: 'error',
            message
          }));
        }
        
        return {
          success: false,
          message,
          error: response.data.error,
          statusCode: response.status
        };
      }
    }
    
    // Return raw response if it doesn't match expected format
    return response;
  } catch (error: any) {
    // Handle network errors or exceptions
    const message = errorMessage || 
      error.response?.data?.message || 
      error.message || 
      defaultErrorMessage;
    
    if (showErrorToast) {
      store.dispatch(addToast({
        type: 'error',
        message
      }));
    }
    
    return {
      success: false,
      message,
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status || 500
    };
  }
};