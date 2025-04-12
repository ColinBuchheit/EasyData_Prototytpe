// src/components/layout/Header.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChevronDown, 
  User, 
  LogOut, 
  Settings, 
  Database,
  Moon,
  Sun,
  HelpCircle,
  Bell
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { logout } from '../../store/slices/authSlice';

const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { theme, updateTheme } = useTheme();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
  };

  const toggleTheme = () => {
    updateTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-zinc-100 font-semibold text-lg">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <span>maiquery</span>
        </Link>

        {/* Right side items */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                2
              </span>
            </button>
            
            {/* Notifications dropdown */}
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg overflow-hidden z-50"
                >
                  <div className="px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="font-medium text-zinc-200">Notifications</h3>
                    <button className="text-xs text-blue-400 hover:text-blue-300">Mark all as read</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <div className="p-3 border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer flex gap-3">
                      <div className="bg-blue-500/20 text-blue-400 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-300">Database connection successful</p>
                        <p className="text-xs text-zinc-500 mt-1">PostgreSQL database connected</p>
                        <p className="text-xs text-zinc-600 mt-1">2 hours ago</p>
                      </div>
                    </div>
                    <div className="p-3 border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer flex gap-3">
                      <div className="bg-green-500/20 text-green-400 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-300">Query optimization available</p>
                        <p className="text-xs text-zinc-500 mt-1">We can improve your recent query performance</p>
                        <p className="text-xs text-zinc-600 mt-1">Yesterday</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 text-xs text-center text-zinc-500 border-t border-zinc-800">
                    <Link to="/notifications" className="text-blue-400 hover:text-blue-300">
                      View all notifications
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Help button */}
          <button 
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          
          {/* User profile */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-3 py-1 px-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-zinc-200">
                  {user?.username || 'User'}
                </div>
                <div className="text-xs text-zinc-400">
                  {user?.email || 'user@example.com'}
                </div>
              </div>
              <ChevronDown className="hidden sm:block w-4 h-4 text-zinc-400" />
            </button>
            
            {/* Profile dropdown menu */}
            <AnimatePresence>
              {profileMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-60 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg overflow-hidden z-50"
                >
                  <div className="p-3 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                        {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-200">
                          {user?.username || 'User'}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {user?.email || 'user@example.com'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    <Link 
                      to="/profile" 
                      className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <User className="w-4 h-4 text-zinc-400" />
                      Profile
                    </Link>
                    <Link 
                      to="/settings" 
                      className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4 text-zinc-400" />
                      Settings
                    </Link>
                    <button 
                      onClick={() => {
                        handleLogout();
                        setProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;