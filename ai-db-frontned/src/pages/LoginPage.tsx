// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Lock, Mail, AlertCircle, ArrowRight, Database, Sparkles } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { login } from '../store/slices/authSlice';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector(state => state.auth);
  
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await dispatch(login(credentials)).unwrap();
      if (result.success) {
        navigate('/dashboard');
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
        
        {/* Login Card */}
        <motion.div
          className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 py-4 px-6 flex items-center gap-3">
            <LogIn className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white">Welcome Back</h2>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-5">
              <Input
                label="Email or Username"
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                leftIcon={<Mail className="w-4 h-4" />}
                placeholder="Enter your email or username"
                required
              />
              
              <Input
                label="Password"
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                leftIcon={<Lock className="w-4 h-4" />}
                placeholder="Enter your password"
                required
              />
              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-zinc-400">Remember me</span>
                </label>
                
                <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              
              <Button
                type="submit"
                variant="default"
                isLoading={loading}
                fullWidth
                className="py-2.5"
              >
                Sign In
              </Button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
              <p className="text-sm text-zinc-400">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors font-medium inline-flex items-center gap-1">
                  Create account <ArrowRight className="w-3 h-3" />
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

export default LoginPage;