// src/components/layout/MainLayout.tsx

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { toggleSidebar } from '../../store/slices/uiSlice';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const MainLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector(state => state.ui);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar - desktop */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 overflow-y-auto transition-all transform bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 lg:translate-x-0 lg:static lg:z-10 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar />
      </div>

      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          toggleSidebar={() => dispatch(toggleSidebar())} 
          toggleMobileSidebar={toggleMobileSidebar}
        />

        <main className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;