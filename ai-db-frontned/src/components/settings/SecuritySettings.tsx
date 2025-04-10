// src/components/settings/SecuritySettings.tsx
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { addToast } from '../../store/slices/uiSlice';
import Input from '../common/Input';
import Button from '../common/Button';
import { authApi } from '../../api/auth.api';
import { Eye, EyeOff, LogOut, KeyRound, Shield, AlertTriangle } from 'lucide-react';
import { logout } from '../../store/slices/authSlice';

const SecuritySettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Form errors
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Loading states
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Session data
  const [sessionData, setSessionData] = useState({
    sessions: [
      { id: 1, device: 'Chrome on Windows', location: 'New York, US', lastActive: '2 hours ago', current: true },
      { id: 2, device: 'Safari on iPhone', location: 'New York, US', lastActive: '2 days ago', current: false },
      { id: 3, device: 'Firefox on Mac', location: 'Boston, US', lastActive: '1 week ago', current: false },
    ]
  });

  // Handle input change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for the field being edited
    setPasswordErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Validate password form
  const validatePasswordForm = (): boolean => {
    const errors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    let isValid = true;

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
      isValid = false;
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
      isValid = false;
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
      isValid = false;
    } else if (!/(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must include an uppercase letter and a number';
      isValid = false;
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (passwordData.confirmPassword !== passwordData.newPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setPasswordErrors(errors);
    return isValid;
  };

  // Handle change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    setChangingPassword(true);
    
    try {
      const result = await authApi.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      if (result.success) {
        // Reset form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // Show success message
        dispatch(addToast({
          type: 'success',
          message: 'Password changed successfully',
        }));
      } else {
        throw new Error('Failed to change password');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      
      dispatch(addToast({
        type: 'error',
        message: errorMessage,
      }));
      
      // Set error for current password as it's likely incorrect
      setPasswordErrors(prev => ({ 
        ...prev, 
        currentPassword: 'Current password is incorrect' 
      }));
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle session termination
  const handleTerminateSession = (sessionId: number) => {
    // Filter out the terminated session
    const updatedSessions = sessionData.sessions.filter(session => session.id !== sessionId);
    setSessionData({ ...sessionData, sessions: updatedSessions });
    
    // Show success message
    dispatch(addToast({
      type: 'success',
      message: 'Session terminated successfully',
    }));
  };

  // Handle logout from all devices
  const handleLogoutAll = () => {
    // Filter to keep only current session
    const updatedSessions = sessionData.sessions.filter(session => session.current);
    setSessionData({ ...sessionData, sessions: updatedSessions });
    
    // Show success message
    dispatch(addToast({
      type: 'success',
      message: 'Logged out from all other devices',
    }));
  };

  // Handle account logout
  const handleLogout = () => {
    dispatch(logout());
    
    // Redirect to login page
    window.location.href = '/login';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Security Settings</h2>
        <p className="text-zinc-400 mb-6">
          Manage your account security, password, and active sessions.
        </p>
      </div>
      
      {/* Change Password Section */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
          <KeyRound className="w-4 h-4" />
          Change Password
        </h3>
        
        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current Password */}
          <div className="relative">
            <Input
              label="Current Password"
              type={showCurrentPassword ? "text" : "password"}
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.currentPassword}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="focus:outline-none"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              }
            />
          </div>
          
          {/* New Password */}
          <div className="relative">
            <Input
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.newPassword}
              hint="Password must be at least 8 characters with an uppercase letter and a number"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="focus:outline-none"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              }
            />
          </div>
          
          {/* Confirm Password */}
          <div className="relative">
            <Input
              label="Confirm New Password"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.confirmPassword}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              }
            />
          </div>
          
          <div className="pt-2">
            <Button 
              type="submit" 
              isLoading={changingPassword}
            >
              Change Password
            </Button>
          </div>
        </form>
      </div>
      
      {/* Active Sessions Section */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Active Sessions
        </h3>
        
        <div className="space-y-4">
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="p-4">
              {sessionData.sessions.map(session => (
                <div 
                  key={session.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-zinc-700 last:border-0 gap-4"
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                      {session.device}
                      {session.current && (
                        <span className="text-xs bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 space-y-1">
                      <div>Location: {session.location}</div>
                      <div>Last active: {session.lastActive}</div>
                    </div>
                  </div>
                  
                  {!session.current && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleTerminateSession(session.id)}
                    >
                      Terminate
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {sessionData.sessions.length > 1 && (
              <div className="px-4 py-3 bg-zinc-850 border-t border-zinc-700 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLogoutAll}
                >
                  Log out from all other devices
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Account Security Section */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Account Security
        </h3>
        
        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-zinc-200">Log Out Everywhere</h4>
              <p className="text-xs text-zinc-400 mt-1">
                This will log you out from all devices, including this one.
                You'll need to log in again.
              </p>
            </div>
            
            <Button
              variant="danger"
              leftIcon={<LogOut className="w-4 h-4" />}
              onClick={handleLogout}
            >
              Log Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
