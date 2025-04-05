// src/components/layout/Sidebar.tsx

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useRedux';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { connections } = useAppSelector(state => state.database);

  // Helper to check if a path is active
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="flex flex-col h-full py-6">
      {/* App name and logo */}
      <div className="px-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">AI Database</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Query your data with AI</p>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 space-y-1 px-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              isActive
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`
          }
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </NavLink>

        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              isActive
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`
          }
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Chat
        </NavLink>

        <NavLink
          to="/databases"
          className={({ isActive }) =>
            `flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              isActive
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`
          }
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          Databases
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              isActive
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`
          }
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </NavLink>
      </nav>

      {/* Database connections list */}
      {connections.length > 0 && (
        <div className="px-4 mt-8">
          <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Your Databases
          </h3>
          <div className="mt-2 space-y-1">
            {connections.map(connection => (
              <button
                key={connection.id}
                className="w-full flex items-center px-4 py-2 text-sm rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {/* Icon based on database type */}
                <span className="w-2 h-2 rounded-full bg-green-500 mr-3" />
                <span className="truncate">{connection.connection_name || connection.database_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;