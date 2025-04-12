// src/components/auth/PasswordResetRequestForm.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch} from '../../hooks/useRedux';
import { addToast } from '../../store/slices/uiSlice';
import { authApi } from '../../api/auth.api';
import Input from '../common/Input';
import Button from '../common/Button';

interface PasswordResetRequestFormProps {
  onSuccess?: () => void;
}

const PasswordResetRequestForm: React.FC<PasswordResetRequestFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    
    // Clear errors when user types
    if (error) {
      setError('');
    }
  };

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Invalid email format');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authApi.requestPasswordReset(email);
      
      // Even if email doesn't exist, the API returns success for security reasons
      // We treat all responses as successful
      setSubmitted(true);
      
      // Show a toast notification
      dispatch(addToast({
        type: 'success',
        message: 'Password reset instructions sent to your email'
      }));
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show success message after form is submitted
  if (submitted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
              Check Your Email
            </h2>
            
            <p className="mb-4 text-gray-600 dark:text-gray-300">
              If an account exists with the email <strong>{email}</strong>, we've sent instructions to reset your password.
            </p>
            
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Please check your inbox and spam folder. The reset link will expire in 15 minutes.
            </p>
            
            <div className="mt-6">
              <Link to="/login" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium">
                Return to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          Reset Your Password
        </h2>
        
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Enter the email address associated with your account, and we'll send you a link to reset your password.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <Input
          label="Email"
          type="email"
          name="email"
          id="email"
          value={email}
          onChange={handleChange}
          error=""
          required
          placeholder="Enter your email"
          autoComplete="email"
        />
        
        <Button
          type="submit"
          variant="default"
          isLoading={loading}
          className="w-full mt-4"
        >
          Send Reset Link
        </Button>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Remember your password?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default PasswordResetRequestForm;
