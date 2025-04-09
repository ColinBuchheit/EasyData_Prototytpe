// src/components/layout/MainLayout.tsx
import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import UserProfileHeader from '../common/UserProfileHeader';
import { useAuth } from '../../hooks/useAuth';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-zinc-900 border-b border-zinc-800 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-zinc-100">Maiquery</h1>
            <UserProfileHeader />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;