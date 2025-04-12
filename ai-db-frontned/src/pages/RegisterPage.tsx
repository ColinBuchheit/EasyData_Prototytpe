// src/pages/RegisterPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, AlertCircle, ArrowLeft, Database, Sparkles } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { register } from '../store/slices/authSlice';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const RegisterPage: React.FC = () => {
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
    
    // Clear error when user types
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
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
      errors.email = 'Email is invalid';
      isValid = false;
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
      isValid = false;
    }
    
    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const { confirmPassword, ...registerData } = formData;
    
    try {
      const result = await dispatch(register(registerData)).unwrap();
      if (result.success) {
        navigate('/login');
      }
    } catch (error) {
      // Error is handled in the Redux store
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div 
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">maiquery</h1>
              <p className="text-blue-400 text-sm">AI-Powered Database Chat</p>
            </div>
          </div>
        </motion.div>
        
        {/* Register Card */}
        <motion.div
          className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Banner */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 py-4 px-6 flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white">Create Account</h2>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label="Username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                leftIcon={<User className="w-4 h-4" />}
                placeholder="Choose a username"
                error={formErrors.username}
                required
              />
              
              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                leftIcon={<Mail className="w-4 h-4" />}
                placeholder="Enter your email"
                error={formErrors.email}
                required
              />
              
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                leftIcon={<Lock className="w-4 h-4" />}
                placeholder="Create a password"
                error={formErrors.password}
                hint="Must be at least 8 characters"
                required
              />
              
              <Input
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                leftIcon={<Lock className="w-4 h-4" />}
                placeholder="Confirm your password"
                error={formErrors.confirmPassword}
                required
              />
              
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="default"
                  isLoading={loading}
                  fullWidth
                  className="py-2.5"
                >
                  Create Account
                </Button>
              </div>
            </form>
            
            <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
              <p className="text-sm text-zinc-400">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium inline-flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Sign in
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Footer */}
        <motion.div 
          className="mt-8 text-center text-zinc-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" /> 
            Powered by AI Database Technology
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;