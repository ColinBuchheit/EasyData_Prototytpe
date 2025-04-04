// src/components/auth/PasswordResetForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import { addToast } from '../../store/slices/uiSlice';
import { authApi } from '../../api/auth.api';
import Input from '../common/Input';
import Button from '../common/Button';

interface PasswordResetFormProps {
  onSuccess?: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    token: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [formErrors, setFormErrors] = useState({
    token: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenValidating, setTokenValidating] = useState(false);

  // Extract token from URL when component mounts
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get('token');
    
    if (token) {
      setFormData(prev => ({ ...prev, token }));
      validateToken(token);
    } else {
      setFormErrors(prev => ({ 
        ...prev, 
        token: 'Reset token is missing. Please use the link from your email.' 
      }));
    }
  }, [location]);

  // Validate the token
  const validateToken = async (token: string) => {
    setTokenValidating(true);
    
    try {
      const response = await authApi.validateResetToken(token);
      setTokenValid(response.success);
      
      if (!response.success) {
        setFormErrors(prev => ({ 
          ...prev, 
          token: 'This password reset link is invalid or has expired.' 
        }));
      }
    } catch (err: any) {
      setTokenValid(false);
      setFormErrors(prev => ({ 
        ...prev, 
        token: err.response?.data?.message || 'Invalid or expired reset token.' 
      }));
    } finally {
      setTokenValidating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field-specific error when user types
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear global error when user makes changes
    if (error) {
      setError('');
    }
  };

  const validateForm = (): boolean => {
    const errors = {
      token: '',
      newPassword: '',
      confirmPassword: ''
    };
    let isValid = true;

    if (!formData.token) {
      errors.token = 'Reset token is required';
      isValid = false;
    }

    // Password validation
    if (!formData.newPassword) {
      errors.newPassword = 'New password is required';
      isValid = false;
    } else if (formData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
      isValid = false;
    } else if (!/(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      errors.newPassword = 'Password must include at least one uppercase letter and one number';
      isValid = false;
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...resetData } = formData;
      const response = await authApi.resetPassword(resetData);
      
      if (response.success) {
        dispatch(addToast({
          type: 'success',
          message: 'Your password has been reset successfully.'
        }));
        
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/login');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If token is being validated, show loading state
  if (tokenValidating) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Validating your reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  // If token is invalid, show error message
  if (tokenValid === false) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
              Invalid or Expired Link
            </h2>
            
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              {formErrors.token || 'This password reset link is invalid or has expired.'}
            </p>
            
            <div className="mt-6">
              <Link 
                to="/forgot-password" 
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Request New Reset Link
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
          Create a new password for your account.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <Input
          label="New Password"
          type="password"
          name="newPassword"
          id="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          error={formErrors.newPassword}
          required
          placeholder="Create new password"
          autoComplete="new-password"
        />
        
        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          id="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={formErrors.confirmPassword}
          required
          placeholder="Confirm new password"
          autoComplete="new-password"
        />
        
        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
          className="w-full mt-4"
        >
          Reset Password
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

export default PasswordResetForm;