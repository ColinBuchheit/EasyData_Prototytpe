// src/components/layout/Header.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { logout } from '../../store/slices/authSlice';
import { setTheme } from '../../store/slices/uiSlice';
import Button from '../common/Button';

interface HeaderProps {
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, toggleMobileSidebar }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { theme } = useAppSelector(state => state.ui);
  const { selectedConnection } = useAppSelector(state => state.database);

  const handleLogout = () => {
    dispatch(logout());
  };

  const toggleDarkMode = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    dispatch(setTheme(newTheme));
  };

  return (
    <header className="sticky top-0 z-10 py-4 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Mobile menu button */}
        <button
          className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          onClick={toggleMobileSidebar}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo and title */}
        <div className="flex items-center">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">AI-DB</span>
          </Link>
          
          {/* Selected database indicator */}
          {selectedConnection && (
            <div className="ml-4 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm hidden md:block">
              {selectedConnection.connection_name || selectedConnection.database_name}
            </div>
          )}
        </div>

        {/* Desktop sidebar toggle */}
        <button
          className="hidden lg:block text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          onClick={toggleSidebar}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
        </button>

        {/* Right side controls */}
        <div className="flex items-center space-x-4">
          {/* Theme toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* User menu */}
          <div className="relative">
            <div className="flex items-center">
              <Link 
                to="/profile"
                className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 py-2 px-3 rounded-md"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden md:block font-medium text-gray-700 dark:text-gray-300">
                  {user?.username || 'User'}
                </span>
              </Link>
            </div>
          </div>

          {/* Logout button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout} 
            className="hidden md:block"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;