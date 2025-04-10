// src/components/layout/MainLayout.tsx
import React, { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

interface MainLayoutProps {
  children?: ReactNode;
}

/**
 * Main layout component that wraps the entire authenticated application
 * Contains the sidebar, header, main content area, and footer
 * Uses Outlet from react-router-dom to render nested routes
 * Now also accepts children props for direct content rendering
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      {/* Sidebar - fixed position */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - sticky top */}
        <Header />
        
        {/* Main content with scrolling */}
        <main className="flex-1 overflow-auto p-6">
          {/* Render children if provided, otherwise render Outlet */}
          {children || <Outlet />}
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
