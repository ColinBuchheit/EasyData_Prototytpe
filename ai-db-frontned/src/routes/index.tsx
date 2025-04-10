// src/routes/index.tsx
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/useRedux';

// Import the layout wrapper component
import MainLayout from '../components/layout/MainLayout';

// Import page components
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import PasswordResetPage from '../pages/PasswordResetPage';
import NotFoundPage from '../pages/NotFoundPage';
import ChatPage from '../pages/ChatPage';
import DatabasePage from '../pages/DatabasePage';
import ProfilePage from '../pages/ProfilePage';
import Dashboard from '../pages/Dashboard';

// Auth Guard Component
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAppSelector(state => state.auth);
  const location = useLocation();
  
  // Show loading indicator while checking auth status
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>;
  }
  
  if (!isAuthenticated) {
    // Redirect to login if not authenticated, preserving the intended destination
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  
  return <>{children}</>;
};

// Public Route Guard - redirect authenticated users away from login/register
const PublicGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppSelector(state => state.auth);
  
  if (isAuthenticated) {
    // Redirect to dashboard if already authenticated
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Main Routes Component
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes - No Layout */}
      <Route path="/login" element={
        <PublicGuard>
          <LoginPage />
        </PublicGuard>
      } />
      
      <Route path="/register" element={
        <PublicGuard>
          <RegisterPage />
        </PublicGuard>
      } />
      
      <Route path="/reset-password" element={
        <PublicGuard>
          <PasswordResetPage />
        </PublicGuard>
      } />
      
      <Route path="/forgot-password" element={
        <PublicGuard>
          <PasswordResetPage isForgotPassword />
        </PublicGuard>
      } />
      
      {/* Protected Routes - Wrapped in MainLayout */}
      <Route element={
        <AuthGuard>
          <MainLayout />
        </AuthGuard>
      }>
        {/* Default redirect */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Main app routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/databases" element={<DatabasePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      
      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;