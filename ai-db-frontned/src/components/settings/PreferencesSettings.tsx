// src/components/settings/PreferencesSettings.tsx
import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { setTheme } from '../../store/slices/uiSlice';
import { UserTheme, UISettings } from '../../types/user.types';
import { Switch } from '@headlessui/react';
import Button from '../common/Button';
import { Database, Monitor, Sun, Moon, Computer, ChevronDown, Check, Save } from 'lucide-react';
import { cn } from '../../utils/format.utils';
import { updateUserPreferences } from '../../store/slices/userSlice';
import { addToast } from '../../store/slices/uiSlice';

const PreferencesSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector(state => state.ui);
  const { profile, loading } = useAppSelector(state => state.user);
  const { connections, selectedConnection } = useAppSelector(state => state.database);
  
  // Languages options
  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'zh', label: 'Chinese' },
  ];
  
  // Date format options
  const dateFormats = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
  ];
  
  // Results per page options
  const resultsPerPageOptions = [10, 25, 50, 100];
  
  // Highlight theme options
  const highlightThemes = [
    { value: 'oneDark', label: 'One Dark' },
    { value: 'oneLight', label: 'One Light' },
    { value: 'github', label: 'GitHub' },
    { value: 'dracula', label: 'Dracula' },
    { value: 'solarizedDark', label: 'Solarized Dark' },
  ];
  
  // Default database dropdown
  const [dbDropdownOpen, setDbDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [dateFormatDropdownOpen, setDateFormatDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  
  // Local state for settings
  const [settings, setSettings] = useState<{
    theme: UserTheme;
    defaultDatabaseId?: number;
    autoVisualize: boolean;
    naturalLanguage: boolean;
    showHints: boolean;
    showTutorials: boolean;
    uiSettings: {
      language: string;
      dateFormat: string;
      resultsPerPage: number;
      codeHighlightTheme: string;
    };
  }>({
    theme: 'system',
    defaultDatabaseId: undefined,
    autoVisualize: true,
    naturalLanguage: true,
    showHints: true,
    showTutorials: true,
    uiSettings: {
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      resultsPerPage: 25,
      codeHighlightTheme: 'oneDark',
    },
  });
  
  // Initialize settings from user preferences
  useEffect(() => {
    // Use Redux UI theme state
    setSettings(prev => ({ ...prev, theme }));
    
    // If we have a profile with preferences, get other settings
    if (profile && profile.preferences) {
      // TypeScript doesn't correctly understand the structure here
      // We need to safely access with fallbacks
      const preferences = profile.preferences as any;
      
      setSettings(prev => ({
        ...prev,
        // Safely access properties with fallbacks to current values
        defaultDatabaseId: preferences?.defaultDatabaseId || prev.defaultDatabaseId,
        uiSettings: {
          language: preferences?.uiSettings?.language || prev.uiSettings.language,
          dateFormat: preferences?.uiSettings?.dateFormat || prev.uiSettings.dateFormat,
          resultsPerPage: preferences?.uiSettings?.resultsPerPage || prev.uiSettings.resultsPerPage,
          codeHighlightTheme: preferences?.uiSettings?.codeHighlightTheme || prev.uiSettings.codeHighlightTheme,
        },
      }));
    }
    
    // If we have a selected connection, use it as default
    if (selectedConnection) {
      setSettings(prev => ({ ...prev, defaultDatabaseId: selectedConnection.id }));
    }
  }, [theme, profile, selectedConnection]);
  
  // Handle theme change
  const handleThemeChange = (newTheme: UserTheme) => {
    setSettings(prev => ({ ...prev, theme: newTheme }));
    dispatch(setTheme(newTheme));
  };
  
  // Handle toggle change
  const handleToggleChange = (name: string, checked: boolean) => {
    setSettings(prev => ({ ...prev, [name]: checked }));
  };
  
  // Handle UI settings change
  const handleUISettingChange = (name: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      uiSettings: {
        ...prev.uiSettings,
        [name]: value,
      },
    }));
  };
  
  // Handle results per page change
  const handleResultsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      handleUISettingChange('resultsPerPage', value);
    }
  };
  
  // Save preferences
  const handleSave = async () => {
    try {
      // Create preferences object
      const preferences = {
        theme: settings.theme,
        defaultDatabaseId: settings.defaultDatabaseId,
        uiSettings: settings.uiSettings,
      };
      
      // Update preferences using Redux thunk
      await dispatch(updateUserPreferences(preferences)).unwrap();
      
      // Show success toast
      dispatch(addToast({
        type: 'success',
        message: 'Preferences saved successfully',
      }));
    } catch (error) {
      // Show error toast
      dispatch(addToast({
        type: 'error',
        message: 'Failed to save preferences',
      }));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Preferences</h2>
        <p className="text-zinc-400 mb-6">
          Customize your application experience and default settings.
        </p>
      </div>
      
      {/* Appearance Settings */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-zinc-200 border-b border-zinc-800 pb-2">
          Appearance
        </h3>
        
        {/* Theme Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="text-sm font-medium text-zinc-300">Theme</label>
            <p className="text-xs text-zinc-500 mt-1">
              Choose the application theme
            </p>
          </div>
          
          <div className="relative">
            <button
              className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-md px-4 py-2 text-zinc-200 w-full sm:w-auto"
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            >
              {settings.theme === 'light' ? (
                <Sun className="w-4 h-4" />
              ) : settings.theme === 'dark' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Computer className="w-4 h-4" />
              )}
              <span className="capitalize">{settings.theme}</span>
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            
            {themeDropdownOpen && (
              <div className="absolute z-10 right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg overflow-hidden">
                <div className="py-1">
                  <button
                    className={cn(
                      "flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-zinc-800",
                      settings.theme === 'light' ? "text-blue-400" : "text-zinc-300"
                    )}
                    onClick={() => {
                      handleThemeChange('light');
                      setThemeDropdownOpen(false);
                    }}
                  >
                    <Sun className="w-4 h-4" />
                    Light
                    {settings.theme === 'light' && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                  <button
                    className={cn(
                      "flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-zinc-800",
                      settings.theme === 'dark' ? "text-blue-400" : "text-zinc-300"
                    )}
                    onClick={() => {
                      handleThemeChange('dark');
                      setThemeDropdownOpen(false);
                    }}
                  >
                    <Moon className="w-4 h-4" />
                    Dark
                    {settings.theme === 'dark' && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                  <button
                    className={cn(
                      "flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-zinc-800",
                      settings.theme === 'system' ? "text-blue-400" : "text-zinc-300"
                    )}
                    onClick={() => {
                      handleThemeChange('system');
                      setThemeDropdownOpen(false);
                    }}
                  >
                    <Computer className="w-4 h-4" />
                    System
                    {settings.theme === 'system' && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Language Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="text-sm font-medium text-zinc-300">Language</label>
            <p className="text-xs text-zinc-500 mt-1">
              Choose the application language
            </p>
          </div>
          
          <div className="relative">
            <button
              className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-md px-4 py-2 text-zinc-200 w-full sm:w-auto"
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
            >
              <span>{languages.find(l => l.value === settings.uiSettings.language)?.label || 'English'}</span>
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            
            {languageDropdownOpen && (
              <div className="absolute z-10 right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg overflow-hidden">
                <div className="py-1">
                  {languages.map(language => (
                    <button
                      key={language.value}
                      className={cn(
                        "flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-zinc-800",
                        settings.uiSettings.language === language.value ? "text-blue-400" : "text-zinc-300"
                      )}
                      onClick={() => {
                        handleUISettingChange('language', language.value);
                        setLanguageDropdownOpen(false);
                      }}
                    >
                      {language.label}
                      {settings.uiSettings.language === language.value && <Check className="w-4 h-4 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Date Format Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="text-sm font-medium text-zinc-300">Date Format</label>
            <p className="text-xs text-zinc-500 mt-1">
              Choose your preferred date format
            </p>
          </div>
          
          <div className="relative">
            <button
              className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-md px-4 py-2 text-zinc-200 w-full sm:w-auto"
              onClick={() => setDateFormatDropdownOpen(!dateFormatDropdownOpen)}
            >
              <span>{dateFormats.find(f => f.value === settings.uiSettings.dateFormat)?.label || 'MM/DD/YYYY (US)'}</span>
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            
            {dateFormatDropdownOpen && (
              <div className="absolute z-10 right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg overflow-hidden">
                <div className="py-1">
                  {dateFormats.map(format => (
                    <button
                      key={format.value}
                      className={cn(
                        "flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-zinc-800",
                        settings.uiSettings.dateFormat === format.value ? "text-blue-400" : "text-zinc-300"
                      )}
                      onClick={() => {
                        handleUISettingChange('dateFormat', format.value);
                        setDateFormatDropdownOpen(false);
                      }}
                    >
                      {format.label}
                      {settings.uiSettings.dateFormat === format.value && <Check className="w-4 h-4 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Query Settings */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-zinc-200 border-b border-zinc-800 pb-2">
          Query Settings
        </h3>
        
        {/* Default Database */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="text-sm font-medium text-zinc-300">Default Database</label>
            <p className="text-xs text-zinc-500 mt-1">
              Choose the default database for queries
            </p>
          </div>
          
          <div className="relative">
            <button
              className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-md px-4 py-2 text-zinc-200 w-full sm:w-auto"
              onClick={() => setDbDropdownOpen(!dbDropdownOpen)}
              disabled={connections.length === 0}
            >
              <Database className="w-4 h-4" />
              <span>
                {connections.find(c => c.id === settings.defaultDatabaseId)?.connection_name || 
                 connections.find(c => c.id === settings.defaultDatabaseId)?.database_name || 
                 'Select Database'}
              </span>
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            
            {dbDropdownOpen && connections.length > 0 && (
              <div className="absolute z-10 right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg overflow-hidden">
                <div className="py-1">
                  {connections.map(connection => (
                    <button
                      key={connection.id}
                      className={cn(
                        "flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-zinc-800",
                        settings.defaultDatabaseId === connection.id ? "text-blue-400" : "text-zinc-300"
                      )}
                      onClick={() => {
                        setSettings(prev => ({ ...prev, defaultDatabaseId: connection.id }));
                        setDbDropdownOpen(false);
                      }}
                    >
                      <Database className="w-4 h-4" />
                      {connection.connection_name || connection.database_name}
                      {settings.defaultDatabaseId === connection.id && <Check className="w-4 h-4 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Auto-Visualize */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-zinc-300">Auto-Visualize Results</label>
            <p className="text-xs text-zinc-500 mt-1">
              Automatically generate visualizations for query results
            </p>
          </div>
          <Switch
            checked={settings.autoVisualize}
            onChange={(checked) => handleToggleChange('autoVisualize', checked)}
            className={`${
              settings.autoVisualize ? 'bg-blue-600' : 'bg-zinc-700'
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span className="sr-only">Auto-visualize</span>
            <span
              className={`${
                settings.autoVisualize ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition`}
            />
          </Switch>
        </div>
        
        {/* Natural Language */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-zinc-300">Natural Language as Default</label>
            <p className="text-xs text-zinc-500 mt-1">
              Use natural language as the default query mode
            </p>
          </div>
          <Switch
            checked={settings.naturalLanguage}
            onChange={(checked) => handleToggleChange('naturalLanguage', checked)}
            className={`${
              settings.naturalLanguage ? 'bg-blue-600' : 'bg-zinc-700'
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span className="sr-only">Natural language</span>
            <span
              className={`${
                settings.naturalLanguage ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition`}
            />
          </Switch>
        </div>
        
        {/* Results Per Page */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="text-sm font-medium text-zinc-300">Results Per Page</label>
            <p className="text-xs text-zinc-500 mt-1">
              Number of rows to display per page
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={settings.uiSettings.resultsPerPage}
              onChange={handleResultsPerPageChange}
              min="1"
              max="1000"
              className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <div className="flex gap-2">
              {resultsPerPageOptions.map(option => (
                <button
                  key={option}
                  onClick={() => handleUISettingChange('resultsPerPage', option)}
                  className={cn(
                    "px-2 py-1 text-xs rounded",
                    settings.uiSettings.resultsPerPage === option
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Help & Feedback */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-zinc-200 border-b border-zinc-800 pb-2">
          Help & Feedback
        </h3>
        
        {/* Show Hints */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-zinc-300">Show Hints</label>
            <p className="text-xs text-zinc-500 mt-1">
              Display hints and suggestions while using the app
            </p>
          </div>
          <Switch
            checked={settings.showHints}
            onChange={(checked) => handleToggleChange('showHints', checked)}
            className={`${
              settings.showHints ? 'bg-blue-600' : 'bg-zinc-700'
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span className="sr-only">Show hints</span>
            <span
              className={`${
                settings.showHints ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition`}
            />
          </Switch>
        </div>
        
        {/* Show Tutorials */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-zinc-300">Show Tutorials</label>
            <p className="text-xs text-zinc-500 mt-1">
              Display tutorial guides for new features
            </p>
          </div>
          <Switch
            checked={settings.showTutorials}
            onChange={(checked) => handleToggleChange('showTutorials', checked)}
            className={`${
              settings.showTutorials ? 'bg-blue-600' : 'bg-zinc-700'
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span className="sr-only">Show tutorials</span>
            <span
              className={`${
                settings.showTutorials ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition`}
            />
          </Switch>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="pt-4 flex justify-end">
        <Button 
          type="button" 
          onClick={handleSave}
          isLoading={loading}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

export default PreferencesSettings;
