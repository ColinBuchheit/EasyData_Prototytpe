// src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '../components/common/Tabs';
import ProfileSettings from '../components/settings/ProfileSettings';
import PreferencesSettings from '../components/settings/PreferencesSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import { User, Shield, Bell, Database, Sliders } from 'lucide-react';
import Button from '../components/common/Button';

const SettingsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get tab from URL path, default to profile
  const getTabFromUrl = (): string => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Check if the last segment is a valid tab
    const validTabs = ['profile', 'preferences', 'security', 'database', 'notifications'];
    return validTabs.includes(lastSegment) ? lastSegment : 'profile';
  };
  
  const [activeTab, setActiveTab] = useState(getTabFromUrl());
  
  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(getTabFromUrl());
  }, [location.pathname]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL without reload using history API
    window.history.pushState(null, '', `/settings/${value}`);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Settings header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-400 mt-2">
          Manage your account settings and preferences
        </p>
      </header>

      {/* Settings tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            orientation="vertical"
            className="w-full"
          >
            <TabsList className="flex flex-col space-y-1 w-full bg-transparent">
              <TabsTrigger
                value="profile"
                className="justify-start text-left px-4 py-3"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="preferences"
                className="justify-start text-left px-4 py-3"
              >
                <Sliders className="w-4 h-4 mr-2" />
                Preferences
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="justify-start text-left px-4 py-3"
              >
                <Shield className="w-4 h-4 mr-2" />
                Security
              </TabsTrigger>
                                     
              <TabsTrigger
                value="notifications"
                className="justify-start text-left px-4 py-3"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          {/* Profile Settings */}
          {activeTab === 'profile' && <ProfileSettings />}

          {/* Preferences Settings */}
          {activeTab === 'preferences' && <PreferencesSettings />}

          {/* Security Settings */}
          {activeTab === 'security' && <SecuritySettings />}

          {/* Database Settings - Now redirects to Databases page */}
          {activeTab === 'database' && (
            <div className="p-6 text-center">
              <Database className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
              <h3 className="text-xl font-semibold text-zinc-100 mb-2">Database Management</h3>
              <p className="text-zinc-400 mb-6">
                Database connection management has been moved to the dedicated Databases tab for better organization.
              </p>
              <Button
                variant="default"
                leftIcon={<Database className="w-4 h-4" />}
                onClick={() => navigate('/databases')}
              >
                Go to Database Management
              </Button>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && <NotificationSettings />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
