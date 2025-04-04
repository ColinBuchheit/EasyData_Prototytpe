// src/components/auth/ChangePasswordForm.tsx
import React, { useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { addToast } from '../../store/slices/uiSlice';
import { authApi } from '../../api/auth.api';
import Input from '../common/Input';
import Button from '../common/Button';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch();
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [formErrors, setFormErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    let isValid = true;

    if (!formData.currentPassword) {
      errors.currentPassword = 'Current password is required';
      isValid = false;
    }

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

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Check if new password is same as current
    if (formData.newPassword && formData.currentPassword && 
        formData.newPassword === formData.currentPassword) {
      errors.newPassword = 'New password must be different from current password';
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
      const response = await authApi.changePassword(
        formData.currentPassword, 
        formData.newPassword
      );
      
      if (response.success) {
        setSuccess(true);
        dispatch(addToast({
          type: 'success',
          message: 'Your password has been changed successfully.'
        }));
        
        // Clear the form
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          Change Password
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            Password changed successfully.
          </div>
        )}
        
        <Input
          label="Current Password"
          type="password"
          name="currentPassword"
          id="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          error={formErrors.currentPassword}
          required
          placeholder="Enter current password"
          autoComplete="current-password"
        />
        
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
          label="Confirm New Password"
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
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Password must be at least 8 characters and include at least one uppercase letter and one number.
        </div>
        
        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
          className="w-full mt-4"
        >
          Change Password
        </Button>
      </form>
    </div>
  );
};

export default ChangePasswordForm;