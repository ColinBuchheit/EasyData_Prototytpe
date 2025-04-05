// src/routes/index.tsx
import React from 'react';
import { Navigate, RouteObject, useRoutes } from 'react-router-dom';
import { useAppSelector } from '../hooks/useRedux';

// Layout Components
import MainLayout from '../components/layout/MainLayout';

// Page Components
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import PasswordResetPage from '../pages/PasswordResetPage';
import NotFoundPage from '../pages/NotFoundPage';
import ChatPage from '../pages/ChatPage';
import DatabasePage from '../pages/DatabasePage';
import ProfilePage from '../pages/ProfilePage';

// Auth Guard Component
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppSelector(state => state.auth);
  
  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
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

// App Routes Configuration
export const AppRoutes: React.FC = () => {
  const routes: RouteObject[] = [
    // Public Routes
    {
      path: '/login',
      element: (
        <PublicGuard>
          <LoginPage />
        </PublicGuard>
      ),
    },
    {
      path: '/register',
      element: (
        <PublicGuard>
          <RegisterPage />
        </PublicGuard>
      ),
    },
    {
      path: '/reset-password',
      element: (
        <PublicGuard>
          <PasswordResetPage />
        </PublicGuard>
      ),
    },
    {
      path: '/forgot-password',
      element: (
        <PublicGuard>
          <PasswordResetPage isForgotPassword />
        </PublicGuard>
      ),
    },
    
    // Protected Routes with MainLayout
    {
      path: '/',
      element: (
        <AuthGuard>
          <MainLayout />
        </AuthGuard>
      ),
      children: [
        {
          path: '/',
          element: <Navigate to="/dashboard" replace />,
        },
        {
          path: '/dashboard',
          element: <ChatPage />,
        },
        {
          path: '/databases',
          element: <DatabasePage />,
        },
        {
          path: '/chat',
          element: <ChatPage />,
        },
        {
          path: '/profile',
          element: <ProfilePage />,
        },
      ],
    },
    
    // 404 Not Found Route
    {
      path: '*',
      element: <NotFoundPage />,
    },
  ];

  const routing = useRoutes(routes);
  
  return <>{routing}</>;
};

export default AppRoutes;