// src/components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { login, clearError } from '../../store/slices/authSlice';
import Input from '../common/Input';
import Button from '../common/Button';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector(state => state.auth);
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field-specific error when user types
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear global error when user makes changes
    if (error) {
      dispatch(clearError());
    }
  };

  const validateForm = (): boolean => {
    const errors = {
      username: '',
      password: ''
    };
    let isValid = true;

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
      isValid = false;
    }

    if (!formData.password) {
      errors.password = 'Password is required';
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

    try {
      const result = await dispatch(login(formData)).unwrap();
      if (result.success) {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      // Error is already handled by the auth slice
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          Log In to EasyData
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <Input
          label="Username"
          type="text"
          name="username"
          id="username"
          value={formData.username}
          onChange={handleChange}
          error={formErrors.username}
          required
          placeholder="Enter your username"
          autoComplete="username"
        />
        
        <Input
          label="Password"
          type="password"
          name="password"
          id="password"
          value={formData.password}
          onChange={handleChange}
          error={formErrors.password}
          required
          placeholder="Enter your password"
          autoComplete="current-password"
        />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Remember me
            </label>
          </div>
          
          <div className="text-sm">
            <Link to="/forgot-password" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
              Forgot password?
            </Link>
          </div>
        </div>
        
        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
          className="w-full"
        >
          Sign In
        </Button>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;