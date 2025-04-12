// src/pages/PasswordResetPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Lock, Mail, AlertCircle, CheckCircle, ArrowLeft, SendIcon } from 'lucide-react';
import { useAppDispatch } from '../hooks/useRedux';
import { addToast } from '../store/slices/uiSlice';
import { authApi } from '../api/auth.api';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import AuthLayout from '../components/layout/AuthLayout';

interface PasswordResetPageProps {
  isForgotPassword?: boolean;
}

const PasswordResetPage: React.FC<PasswordResetPageProps> = ({ isForgotPassword = false }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  // States for password reset request form
  const [email, setEmail] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  
  // States for password reset form
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
  const [validatingToken, setValidatingToken] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [resetComplete, setResetComplete] = useState(false);

  // Extract token from URL when component mounts (only for reset form)
  useEffect(() => {
    if (!isForgotPassword) {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      
      if (token) {
        setFormData(prev => ({ ...prev, token }));
        setValidatingToken(true);
        validateToken(token);
      } else {
        setTokenValid(false);
        setFormErrors(prev => ({ 
          ...prev, 
          token: 'Reset token is missing. Please use the link from your email.' 
        }));
      }
    }
  }, [location, isForgotPassword]);

  const validateToken = async (token: string) => {
    try {
      const response = await authApi.validateResetToken(token);
      setTokenValid(response.success);
      
      if (!response.success) {
        setFormErrors(prev => ({ 
          ...prev, 
          token: 'This password reset link is invalid or has expired.' 
        }));
      }
    } catch (error) {
      setTokenValid(false);
      setFormErrors(prev => ({ 
        ...prev, 
        token: 'Failed to validate reset token.' 
      }));
    } finally {
      setValidatingToken(false);
    }
  };

  // Handle password reset request
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await authApi.requestPasswordReset(email);
      
      if (response.success) {
        setRequestSubmitted(true);
        
        dispatch(addToast({
          type: 'success',
          message: 'Password reset instructions sent to your email'
        }));
      } else {
        setError('Failed to send reset instructions');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle input change for reset form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate reset form
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
    
    if (!formData.newPassword) {
      errors.newPassword = 'New password is required';
      isValid = false;
    } else if (formData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
      isValid = false;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };

  // Handle password reset submission
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const { confirmPassword, ...resetData } = formData;
      const response = await authApi.resetPassword(resetData);
      
      if (response.success) {
        setResetComplete(true);
        
        dispatch(addToast({
          type: 'success',
          message: 'Your password has been reset successfully'
        }));
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError('Failed to reset password');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Render password reset request form
  const renderResetRequestForm = () => (
    <motion.div
      className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 py-4 px-6 flex items-center gap-3">
        <KeyRound className="w-5 h-5 text-white" />
        <h2 className="text-xl font-bold text-white">Reset Password</h2>
      </div>
      
      <div className="p-6">
        {requestSubmitted ? (
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
            
            <form onSubmit={handleResetRequest} className="space-y-5">
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
  );

  // Render password reset form
  const renderResetForm = () => (
    <motion.div
      className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 py-4 px-6 flex items-center gap-3">
        <KeyRound className="w-5 h-5 text-white" />
        <h2 className="text-xl font-bold text-white">Reset Password</h2>
      </div>
      
      <div className="p-6">
        {validatingToken ? (
          <div className="text-center py-8">
            <motion.div 
              className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-zinc-400">Validating reset link...</p>
          </div>
        ) : tokenValid === false ? (
          <div className="text-center py-8">
            <div className="bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Invalid or Expired Link</h3>
            
            <p className="text-zinc-400 mb-6">
              {formErrors.token || 'This password reset link is invalid or has expired.'}
            </p>
            
            <Link 
              to="/forgot-password" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors inline-block"
            >
              Request New Reset Link
            </Link>
          </div>
        ) : resetComplete ? (
          <div className="text-center py-8">
            <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Password Reset Complete</h3>
            
            <p className="text-zinc-400 mb-6">
              Your password has been reset successfully.
            </p>
            
            <p className="text-sm text-zinc-500 mb-6">
              You will be redirected to the login page in a few seconds.
            </p>
            
            <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <p className="text-zinc-400 mb-6">
              Create a new password for your account.
            </p>
            
            {error && (
              <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleResetSubmit} className="space-y-5">
              <Input
                label="New Password"
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                leftIcon={<Lock className="w-4 h-4" />}
                placeholder="Create new password"
                error={formErrors.newPassword}
                hint="Must be at least 8 characters"
                required
              />
              
              <Input
                label="Confirm New Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                leftIcon={<Lock className="w-4 h-4" />}
                placeholder="Confirm new password"
                error={formErrors.confirmPassword}
                required
              />
              
              <Button
                type="submit"
                variant="default"
                isLoading={loading}
                fullWidth
                className="py-2.5"
              >
                Reset Password
              </Button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
              <p className="text-sm text-zinc-400">
                Remember your password?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium inline-flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Sign in
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );

  return (
    <AuthLayout>
      {isForgotPassword ? renderResetRequestForm() : renderResetForm()}
    </AuthLayout>
  );
};

export default PasswordResetPage;