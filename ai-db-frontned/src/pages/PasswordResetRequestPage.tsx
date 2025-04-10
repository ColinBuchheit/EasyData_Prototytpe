// src/pages/PasswordResetRequestPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Mail, ArrowLeft, AlertCircle, Database, Sparkles, SendIcon } from 'lucide-react';
import { useAppDispatch } from '../hooks/useRedux';
import { addToast } from '../store/slices/uiSlice';
import { authApi } from '../api/auth.api';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const PasswordResetRequestPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await authApi.requestPasswordReset(email);
      
      if (response.success) {
        setSubmitted(true);
        
        dispatch(addToast({
          type: 'success',
          message: 'Password reset instructions sent to your email'
        }));
      } else {
        setError((response as any).message || 'Failed to send reset instructions');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
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
        
        {/* Card */}
        <motion.div
          className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 py-4 px-6 flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white">Reset Password</h2>
          </div>
          
          <div className="p-6">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SendIcon className="w-8 h-8 text-blue-400" />
                </div>
                
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">Check Your Email</h3>
                
                <p className="text-zinc-400 mb-6">
                  We've sent password reset instructions to: <br />
                  <span className="text-blue-400 font-medium">{email}</span>
                </p>
                
                <p className="text-sm text-zinc-500 mb-6">
                  If you don't receive an email within a few minutes, please check your spam folder.
                </p>
                
                <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium inline-flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </Link>
              </motion.div>
            ) : (
              <>
                <p className="text-zinc-400 mb-6">
                  Enter your email address and we'll send you instructions to reset your password.
                </p>
                
                {error && (
                  <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input
                    label="Email Address"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    placeholder="Enter your email"
                    required
                  />
                  
                  <Button
                    type="submit"
                    variant="default"
                    isLoading={loading}
                    fullWidth
                    className="py-2.5"
                  >
                    Send Reset Instructions
                  </Button>
                </form>
                
                <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                  <p className="text-sm text-zinc-400">
                    Remember your password?{' '}
                    <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium inline-flex items-center gap-1">
                      <ArrowLeft className="w-3 h-3" /> Back to Sign In
                    </Link>
                  </p>
                </div>
              </>
            )}
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

export default PasswordResetRequestPage;
