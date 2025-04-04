// src/components/auth/RegisterForm.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { register, clearError } from '../../store/slices/authSlice';
import { addToast } from '../../store/slices/uiSlice';
import Input from '../common/Input';
import Button from '../common/Button';

interface RegisterFormProps {
  onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector(state => state.auth);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [formErrors, setFormErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
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
      email: '',
      password: '',
      confirmPassword: ''
    };
    let isValid = true;

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
      isValid = false;
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email format';
      isValid = false;
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
      isValid = false;
    } else if (!/(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must include at least one uppercase letter and one number';
      isValid = false;
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
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

    // Create the registration data (exclude confirmPassword)
    const { confirmPassword, ...registrationData } = formData;

    try {
      const result = await dispatch(register(registrationData)).unwrap();
      if (result.success) {
        dispatch(addToast({
          type: 'success',
          message: 'Registration successful. Please log in with your new account.'
        }));
        
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/login');
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
          Create Account
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
          placeholder="Choose a username"
          autoComplete="username"
        />
        
        <Input
          label="Email"
          type="email"
          name="email"
          id="email"
          value={formData.email}
          onChange={handleChange}
          error={formErrors.email}
          required
          placeholder="Enter your email"
          autoComplete="email"
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
          placeholder="Create a password"
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
          placeholder="Confirm your password"
          autoComplete="new-password"
        />
        
        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
          className="w-full mt-4"
        >
          Create Account
        </Button>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;