// src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  PaintBucket, 
  Database, 
  Layout, 
  Code,
  Type,
  Plus,
  KeyRound,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { setTheme } from '../store/slices/uiSlice';
import { updateUserPreferences } from '../store/slices/userSlice';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import ThemeSwitcher from '../components/settings/ThemeSwitcher';
import { UserTheme, UserPreferencesUpdateData } from '../types/user.types';
import useToast from '../hooks/useToast';

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'connections' | 'security' | 'advanced';

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { success, error, info } = useToast();
  const { profile, preferences, loading } = useAppSelector(state => state.user);
  const { theme } = useAppSelector(state => state.ui);
  const { connections } = useAppSelector(state => state.database);
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [profileData, setProfileData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    email: profile?.contactEmail || '',
    jobTitle: profile?.jobTitle || '',
    organization: profile?.organization || '',
  });
  
  // Initialize with data from Redux store when available
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: preferences?.notificationSettings.emailNotifications || true,
    queryCompletionAlerts: preferences?.notificationSettings.queryCompletionAlerts || true,
    securityAlerts: preferences?.notificationSettings.securityAlerts || true,
    weeklyDigest: preferences?.notificationSettings.weeklyDigest || false,
  });
  
  const [advancedSettings, setAdvancedSettings] = useState({
    resultsPerPage: preferences?.uiSettings.resultsPerPage || 20,
    timeoutSeconds: 30,
    defaultLanguage: preferences?.uiSettings.language || 'en-US',
    saveQueryHistory: true,
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiration: 90,
    ipRestrictions: false,
  });

  // Update state when preferences change in the Redux store
  useEffect(() => {
    if (preferences) {
      setNotificationSettings({
        emailNotifications: preferences.notificationSettings.emailNotifications,
        queryCompletionAlerts: preferences.notificationSettings.queryCompletionAlerts,
        securityAlerts: preferences.notificationSettings.securityAlerts,
        weeklyDigest: preferences.notificationSettings.weeklyDigest,
      });
      
      setAdvancedSettings(prev => ({
        ...prev,
        resultsPerPage: preferences.uiSettings.resultsPerPage,
        defaultLanguage: preferences.uiSettings.language,
      }));
    }
  }, [preferences]);
  
  // Update state when profile changes in the Redux store
  useEffect(() => {
    if (profile) {
      setProfileData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.contactEmail || '',
        jobTitle: profile.jobTitle || '',
        organization: profile.organization || '',
      });
    }
  }, [profile]);
  
  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleNotificationChange = (field: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAdvancedChange = (field: string, value: any) => {
    setAdvancedSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSecurityChange = (field: string, value: any) => {
    setSecuritySettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleThemeChange = (newTheme: UserTheme) => {
    dispatch(setTheme(newTheme));
    
    // Also save to user preferences
    const preferencesData: UserPreferencesUpdateData = {
      theme: newTheme
    };
    
    dispatch(updateUserPreferences(preferencesData))
      .unwrap()
      .then(() => {
        success('Theme preferences saved');
      })
      .catch((err) => {
        error('Failed to save theme preferences');
        console.error('Theme save error:', err);
      });
  };
  
  const handleSaveAppearanceSettings = () => {
    const preferencesData: UserPreferencesUpdateData = {
      theme,
      uiSettings: {
        codeHighlightTheme: 'dark', // You can add a form field for this
        // Include other UI settings
      }
    };
    
    dispatch(updateUserPreferences(preferencesData))
      .unwrap()
      .then(() => {
        success('Appearance settings saved successfully');
      })
      .catch((err) => {
        error('Failed to save appearance settings');
        console.error('Save error:', err);
      });
  };
  
  const handleSaveNotificationSettings = () => {
    const preferencesData: UserPreferencesUpdateData = {
      notificationSettings: notificationSettings
    };
    
    dispatch(updateUserPreferences(preferencesData))
      .unwrap()
      .then(() => {
        success('Notification settings saved successfully');
      })
      .catch((err) => {
        error('Failed to save notification settings');
        console.error('Save error:', err);
      });
  };
  
  const handleSaveAdvancedSettings = () => {
    const preferencesData: UserPreferencesUpdateData = {
      uiSettings: {
        resultsPerPage: advancedSettings.resultsPerPage,
        language: advancedSettings.defaultLanguage,
        // Include any other UI settings you have
        dateFormat: preferences?.uiSettings.dateFormat || 'MM/DD/YYYY',
        timezone: preferences?.uiSettings.timezone || 'UTC',
        codeHighlightTheme: preferences?.uiSettings.codeHighlightTheme || 'dark',
      }
    };
    
    dispatch(updateUserPreferences(preferencesData))
      .unwrap()
      .then(() => {
        success('Advanced settings saved successfully');
      })
      .catch((err) => {
        error('Failed to save advanced settings');
        console.error('Save error:', err);
      });
  };

  const tabs: Array<{id: SettingsTab, label: string, icon: React.ReactNode}> = [
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'appearance', label: 'Appearance', icon: <PaintBucket className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    { id: 'connections', label: 'Connections', icon: <Database className="w-5 h-5" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-5 h-5" /> },
    { id: 'advanced', label: 'Advanced', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Page Header */}
      <header className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-zinc-100">Settings</h1>
          <p className="text-zinc-400 mt-2">Configure your account and application preferences</p>
        </motion.div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-1"
        >
          <Card className="sticky top-8">
            <div className="p-4">
              <div className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeTab === tab.id 
                        ? 'bg-blue-600 text-white' 
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
        
        {/* Settings Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-3"
          key={activeTab}
        >
          <Card>
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-zinc-100 mb-6">Profile Settings</h2>
                
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/3">
                      <Input 
                        label="First Name" 
                        value={profileData.firstName} 
                        onChange={(e) => handleProfileChange('firstName', e.target.value)}
                      />
                    </div>
                    <div className="md:w-1/3">
                      <Input 
                        label="Last Name" 
                        value={profileData.lastName} 
                        onChange={(e) => handleProfileChange('lastName', e.target.value)}
                      />
                    </div>
                    <div className="md:w-1/3">
                      <Input 
                        label="Email" 
                        type="email"
                        value={profileData.email} 
                        onChange={(e) => handleProfileChange('email', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/2">
                      <Input 
                        label="Job Title" 
                        value={profileData.jobTitle} 
                        onChange={(e) => handleProfileChange('jobTitle', e.target.value)}
                      />
                    </div>
                    <div className="md:w-1/2">
                      <Input 
                        label="Organization" 
                        value={profileData.organization} 
                        onChange={(e) => handleProfileChange('organization', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Profile Picture
                    </label>
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-zinc-400" />
                      </div>
                      <div>
                        <Button variant="outline" size="sm">Upload Image</Button>
                        <p className="text-xs text-zinc-500 mt-2">
                          Recommended size: 256x256 pixels. Max file size: 2MB.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <Button 
                    onClick={() => {/* Handle profile save */}}
                    isLoading={loading}
                  >
                    Save Profile
                  </Button>
                </div>
              </div>
            )}
            
            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-zinc-100 mb-6">Appearance Settings</h2>
                
                <div className="space-y-8">
                  {/* Theme Selection */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">Theme</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <ThemeSwitcher 
                        currentTheme={theme}
                        onChange={handleThemeChange}
                      />
                    </div>
                  </div>
                  
                  {/* Layout Options */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">Layout</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-zinc-800 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Layout className="w-5 h-5 text-zinc-400" />
                          <div>
                            <p className="text-zinc-200">Compact Mode</p>
                            <p className="text-xs text-zinc-500">Reduce spacing for a more compact interface</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={false}
                            onChange={() => {}}
                          />
                          <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      {/* Code Editor Theme */}
                      <div className="flex items-center justify-between bg-zinc-800 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Code className="w-5 h-5 text-zinc-400" />
                          <div>
                            <p className="text-zinc-200">Code Editor Theme</p>
                            <p className="text-xs text-zinc-500">Choose syntax highlighting theme for SQL editor</p>
                          </div>
                        </div>
                        <select className="bg-zinc-700 text-zinc-200 rounded border border-zinc-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="dark">Dark</option>
                          <option value="light">Light</option>
                          <option value="dracula">Dracula</option>
                          <option value="github">GitHub</option>
                        </select>
                      </div>
                      
                      {/* Font Size */}
                      <div className="flex items-center justify-between bg-zinc-800 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Type className="w-5 h-5 text-zinc-400" />
                          <div>
                            <p className="text-zinc-200">Font Size</p>
                            <p className="text-xs text-zinc-500">Adjust UI text size</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="w-8 h-8 rounded bg-zinc-700 text-zinc-300 flex items-center justify-center text-lg">
                            -
                          </button>
                          <span className="w-8 text-center text-zinc-200">14</span>
                          <button className="w-8 h-8 rounded bg-zinc-700 text-zinc-300 flex items-center justify-center text-lg">
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sidebar Options */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">Sidebar</h3>
                    <div className="bg-zinc-800 rounded-lg p-4">
                      <div className="mb-4">
                        <p className="text-zinc-200 mb-2">Default Sidebar State</p>
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 rounded bg-blue-600 text-white">Expanded</button>
                          <button className="px-3 py-1.5 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors">Collapsed</button>
                        </div>
                      </div>
                      <div>
                        <p className="text-zinc-200 mb-2">Sidebar Sections</p>
                        <div className="space-y-2">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-zinc-300">Recent Chats</span>
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={true}
                              onChange={() => {}}
                            />
                            <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-zinc-300">Quick Actions</span>
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={true}
                              onChange={() => {}}
                            />
                            <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-zinc-300">Connected Databases</span>
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={true}
                              onChange={() => {}}
                            />
                            <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <Button onClick={handleSaveSettings}>Save Appearance Settings</Button>
                </div>
              </div>
            )}
            
            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-zinc-100 mb-6">Notification Settings</h2>
                
                <div className="space-y-6">
                  {/* Email Notifications */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">Email Notifications</h3>
                    <div className="space-y-3 bg-zinc-800 rounded-lg p-4">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-zinc-200">Email Notifications</span>
                          <p className="text-xs text-zinc-500">Receive email notifications</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notifications.emailNotifications}
                          onChange={() => handleNotificationChange('emailNotifications', !notifications.emailNotifications)}
                        />
                        <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-zinc-200">Query Completion</span>
                          <p className="text-xs text-zinc-500">Get notified when long-running queries complete</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notifications.queryCompletionAlerts}
                          onChange={() => handleNotificationChange('queryCompletionAlerts', !notifications.queryCompletionAlerts)}
                        />
                        <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-zinc-200">Security Alerts</span>
                          <p className="text-xs text-zinc-500">Receive security and account-related alerts</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notifications.securityAlerts}
                          onChange={() => handleNotificationChange('securityAlerts', !notifications.securityAlerts)}
                        />
                        <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-zinc-200">Weekly Digest</span>
                          <p className="text-xs text-zinc-500">Receive weekly summary of database activity</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notifications.weeklyDigest}
                          onChange={() => handleNotificationChange('weeklyDigest', !notifications.weeklyDigest)}
                        />
                        <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                  
                  {/* In-App Notifications */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">In-App Notifications</h3>
                    <div className="space-y-3 bg-zinc-800 rounded-lg p-4">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-zinc-200">Desktop Notifications</span>
                          <p className="text-xs text-zinc-500">Show browser notifications</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={true}
                          onChange={() => {}}
                        />
                        <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-zinc-200">Sound Effects</span>
                          <p className="text-xs text-zinc-500">Play sounds for notifications</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={false}
                          onChange={() => {}}
                        />
                        <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <Button onClick={handleSaveSettings}>Save Notification Settings</Button>
                </div>
              </div>
            )}
            
            {/* Connections Settings */}
            {activeTab === 'connections' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-zinc-100 mb-6">Database Connections</h2>
                
                <div className="space-y-8">
                  {/* Connection List */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-zinc-200">Your Connections</h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        Add Connection
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {connections.length === 0 ? (
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 text-center">
                          <Database className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                          <h4 className="text-zinc-300 font-medium mb-2">No Connections</h4>
                          <p className="text-zinc-500 text-sm mb-4">You haven't added any database connections yet.</p>
                          <Button variant="default" size="sm">Connect Database</Button>
                        </div>
                      ) : (
                        connections.map((conn, index) => (
                          <div key={conn.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex items-start gap-3">
                                <div className="bg-zinc-700 p-2 rounded-lg">
                                  <Database className="w-6 h-6 text-zinc-300" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-zinc-200">{conn.connection_name || conn.database_name}</h4>
                                  <p className="text-sm text-zinc-500">{conn.host}:{conn.port}</p>
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className={`w-2 h-2 rounded-full ${conn.is_connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    <span className="text-xs text-zinc-400">{conn.is_connected ? 'Connected' : 'Disconnected'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm">Edit</Button>
                                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">Remove</Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Default Connection */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">Default Connection</h3>
                    <div className="bg-zinc-800 rounded-lg p-4">
                      <p className="text-zinc-400 text-sm mb-3">Select the default database connection to use when opening a new chat.</p>
                      <select className="w-full bg-zinc-700 text-zinc-200 rounded border border-zinc-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Default Connection</option>
                        {connections.map(conn => (
                          <option key={conn.id} value={conn.id}>
                            {conn.connection_name || conn.database_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Connection Settings */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">Connection Settings</h3>
                    <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
                      <div>
                        <label className="block text-zinc-300 text-sm mb-2">Connection Timeout (seconds)</label>
                        <input 
                          type="number" 
                          className="w-full bg-zinc-700 text-zinc-200 rounded border border-zinc-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                          value="30"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-zinc-300 text-sm mb-2">Max Query Results</label>
                        <input 
                          type="number" 
                          className="w-full bg-zinc-700 text-zinc-200 rounded border border-zinc-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                          value="1000"
                        />
                      </div>
                      
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-zinc-300">Auto-Reconnect</span>
                          <p className="text-xs text-zinc-500">Automatically reconnect if connection is lost</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={true}
                          onChange={() => {}}
                        />
                        <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <Button onClick={handleSaveSettings}>Save Connection Settings</Button>
                </div>
              </div>
            )}
            
            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-zinc-100 mb-6">Security Settings</h2>
                
                <div className="space-y-8">
                  {/* Password Settings */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">Password</h3>
                    <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
                      <div>
                        <label className="block text-zinc-300 text-sm mb-2">Current Password</label>
                        <Input 
                          type="password"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-300 text-sm mb-2">New Password</label>
                        <Input 
                          type="password"
                          placeholder="Enter new password"
                        />
                        <p className="text-xs text-zinc-500 mt-1">Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character.</p>
                      </div>
                      <div>
                        <label className="block text-zinc-300 text-sm mb-2">Confirm New Password</label>
                        <Input 
                          type="password"
                          placeholder="Confirm new password"
                        />
                      </div>
                      <Button variant="default" size="sm">Change Password</Button>
                    </div>
                  </div>
                  
                  {/* Two-Factor Authentication */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">Two-Factor Authentication</h3>
                    <div className="bg-zinc-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-zinc-200 font-medium">Two-Factor Authentication</p>
                          <p className="text-xs text-zinc-500 mt-1">Add an extra layer of security to your account</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-red-400 bg-red-900/20 px-2 py-1 rounded">Disabled</span>
                          <Button variant="default" size="sm">Enable</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Session Settings */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">Session Settings</h3>
                    <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
                      <div>
                        <label className="block text-zinc-300 text-sm mb-2">Session Timeout (minutes)</label>
                        <select className="w-full bg-zinc-700 text-zinc-200 rounded border border-zinc-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="15">15 minutes</option>
                          <option value="30" selected>30 minutes</option>
                          <option value="60">60 minutes</option>
                          <option value="120">2 hours</option>
                          <option value="240">4 hours</option>
                        </select>
                        <p className="text-xs text-zinc-500 mt-1">You'll be logged out after this period of inactivity.</p>
                      </div>
                      
                      <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 border-red-700 hover:bg-red-900/20">
                        Sign Out of All Sessions
                      </Button>
                    </div>
                  </div>
                  
                  {/* IP Restrictions */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">IP Access Control</h3>
                    <div className="bg-zinc-800 rounded-lg p-4">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-zinc-200">IP Restrictions</span>
                          <p className="text-xs text-zinc-500">Limit account access to specific IP addresses</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={security.ipRestrictions}
                          onChange={() => handleSecurityChange('ipRestrictions', !security.ipRestrictions)}
                        />
                        <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <Button onClick={handleSaveSettings}>Save Security Settings</Button>
                </div>
              </div>
            )}
            
            {/* Advanced Settings */}
            {activeTab === 'advanced' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-zinc-100 mb-6">Advanced Settings</h2>
                
                <div className="space-y-8">
                  {/* Query Settings */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">Query Settings</h3>
                    <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
                      <div>
                        <label className="block text-zinc-300 text-sm mb-2">Results Per Page</label>
                        <select className="w-full bg-zinc-700 text-zinc-200 rounded border border-zinc-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={advanced.resultsPerPage}
                          onChange={(e) => handleAdvancedChange('resultsPerPage', parseInt(e.target.value))}
                        >
                          <option value="10">10 rows</option>
                          <option value="20">20 rows</option>
                          <option value="50">50 rows</option>
                          <option value="100">100 rows</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-zinc-300 text-sm mb-2">Query Timeout (seconds)</label>
                        <input 
                          type="number" 
                          className="w-full bg-zinc-700 text-zinc-200 rounded border border-zinc-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                          value={advanced.timeoutSeconds}
                          onChange={(e) => handleAdvancedChange('timeoutSeconds', parseInt(e.target.value))}
                        />
                        <p className="text-xs text-zinc-500 mt-1">Maximum time a query can run before timing out</p>
                      </div>
                      
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-zinc-200">Save Query History</span>
                          <p className="text-xs text-zinc-500">Store history of executed queries</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={advanced.saveQueryHistory}
                          onChange={() => handleAdvancedChange('saveQueryHistory', !advanced.saveQueryHistory)}
                        />
                        <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Language & Region */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">Language & Region</h3>
                    <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
                      <div>
                        <label className="block text-zinc-300 text-sm mb-2">Language</label>
                        <select className="w-full bg-zinc-700 text-zinc-200 rounded border border-zinc-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={advanced.defaultLanguage}
                          onChange={(e) => handleAdvancedChange('defaultLanguage', e.target.value)}
                        >
                          <option value="en-US">English (United States)</option>
                          <option value="en-GB">English (United Kingdom)</option>
                          <option value="es-ES">Spanish (Spain)</option>
                          <option value="fr-FR">French (France)</option>
                          <option value="de-DE">German (Germany)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-zinc-300 text-sm mb-2">Timezone</label>
                        <select className="w-full bg-zinc-700 text-zinc-200 rounded border border-zinc-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time (US & Canada)</option>
                          <option value="America/Chicago">Central Time (US & Canada)</option>
                          <option value="America/Denver">Mountain Time (US & Canada)</option>
                          <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                          <option value="Europe/London">London</option>
                          <option value="Europe/Paris">Paris</option>
                          <option value="Asia/Tokyo">Tokyo</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-zinc-300 text-sm mb-2">Date Format</label>
                        <select className="w-full bg-zinc-700 text-zinc-200 rounded border border-zinc-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                 {/* Data & Privacy */}
 {/* Data & Privacy */}
                <div>
                <h3 className="text-lg font-medium text-zinc-200 mb-4">Data & Privacy</h3>
                <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                    <div>
                        <span className="text-zinc-200">Usage Analytics</span>
                        <p className="text-xs text-zinc-500">Share anonymous usage data to help improve the product</p>
                    </div>
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={true}
                        onChange={() => {}}
                    />
                    <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                    <div>
                        <span className="text-zinc-200">Query Storage</span>
                        <p className="text-xs text-zinc-500">Store queries for history and analysis</p>
                    </div>
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={true}
                        onChange={() => {}}
                    />
                    <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>

                    <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 border-red-700 hover:bg-red-900/20">
                    Clear All Data & History
                    </Button>
                </div>
                </div>



                  
                  {/* Account Actions */}
                  <div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-4">Account Actions</h3>
                    <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
                      <p className="text-zinc-400 text-sm">These actions are permanent and cannot be undone.</p>
                      
                      <Button variant="outline" size="sm" className="text-amber-400 hover:text-amber-300 border-amber-700 hover:bg-amber-900/20">
                        Export My Data
                      </Button>
                      
                      <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 border-red-700 hover:bg-red-900/20">
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <Button onClick={handleSaveSettings}>Save Advanced Settings</Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
                      