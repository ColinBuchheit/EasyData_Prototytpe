// src/components/settings/NotificationSettings.tsx
import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { addToast } from '../../store/slices/uiSlice';
import { NotificationSettings as NotificationSettingsType } from '../../types/user.types';
import { Switch } from '@headlessui/react';
import Button from '../common/Button';
import { Save, Bell, Database, ExternalLink, ChartBar, ShieldAlert } from 'lucide-react';

const NotificationSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profile, loading } = useAppSelector(state => state.user);
  
  // Local state for notification settings
  const [settings, setSettings] = useState<NotificationSettingsType>({
    emailNotifications: true,
    queryCompletionAlerts: true,
    securityAlerts: true,
    performanceAlerts: false,
    weeklyDigest: true
  });
  
  // Initialize settings from user preferences
  useEffect(() => {
    // Using optional chaining for type safety
    if (profile && profile.preferences) {
      const userSettings = profile.preferences.notificationSettings;
      if (userSettings) {
        setSettings(prevSettings => ({
          ...prevSettings,
          ...userSettings
        }));
      }
    }
  }, [profile]);
  
  // Handle toggle change
  const handleToggleChange = (name: keyof NotificationSettingsType) => {
    setSettings(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };
  
  // Handle save settings
  const handleSaveSettings = () => {
    // This would be replaced with an actual API call
    console.log('Saving notification settings:', settings);
    
    // Show success message
    dispatch(addToast({
      type: 'success',
      message: 'Notification settings saved successfully',
    }));
  };
  
  // Helper to render a notification toggle
  const renderNotificationToggle = (
    name: keyof NotificationSettingsType,
    label: string,
    description: string,
    icon: React.ReactNode
  ) => {
    return (
      <div className="flex items-center justify-between py-4 border-b border-zinc-800 last:border-0">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-medium text-zinc-200">{label}</h4>
            <p className="text-xs text-zinc-400 mt-1">{description}</p>
          </div>
        </div>
        <Switch
          checked={settings[name]}
          onChange={() => handleToggleChange(name)}
          className={`${
            settings[name] ? 'bg-blue-600' : 'bg-zinc-700'
          } relative inline-flex h-6 w-11 items-center rounded-full`}
        >
          <span className="sr-only">{label}</span>
          <span
            className={`${
              settings[name] ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition`}
          />
        </Switch>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Notification Settings</h2>
        <p className="text-zinc-400 mb-6">
          Configure how and when you receive notifications about your database and queries.
        </p>
      </div>
      
      {/* Email Notifications */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Email Notifications
        </h3>
        
        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 px-4">
          {renderNotificationToggle(
            'emailNotifications',
            'Email Notifications',
            'Receive notifications to your registered email address',
            <Bell className="w-4 h-4 text-blue-400" />
          )}
          
          <div className="px-4 py-3 bg-blue-900/20 border-t border-blue-800/30 rounded-b-lg text-xs text-blue-300">
            <p>
              Email notifications must be enabled to receive any notifications via email.
              You can still see all notifications in the app.
            </p>
          </div>
        </div>
      </div>
      
      {/* Application Notifications */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Application Notifications
        </h3>
        
        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 px-4">
          {renderNotificationToggle(
            'queryCompletionAlerts',
            'Query Completion Alerts',
            'Get notified when your long-running queries are completed',
            <Database className="w-4 h-4 text-green-400" />
          )}
          
          {renderNotificationToggle(
            'securityAlerts',
            'Security Alerts',
            'Receive alerts about potential security issues with your account or databases',
            <ShieldAlert className="w-4 h-4 text-red-400" />
          )}
          
          {renderNotificationToggle(
            'performanceAlerts',
            'Performance Alerts',
            'Get notified about database performance issues and optimization opportunities',
            <ChartBar className="w-4 h-4 text-yellow-400" />
          )}
          
          {renderNotificationToggle(
            'weeklyDigest',
            'Weekly Digest',
            'Receive a weekly summary of your database activity and query performance',
            <ExternalLink className="w-4 h-4 text-purple-400" />
          )}
        </div>
      </div>
      
      {/* Save Button */}
      <div className="pt-4 flex justify-end">
        <Button 
          type="button" 
          onClick={handleSaveSettings}
          isLoading={loading}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Notifications
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
