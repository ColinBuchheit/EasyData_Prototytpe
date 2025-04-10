// src/routes/index.tsx
import React from 'react';
import { Navigate, Outlet, RouteObject, useLocation, useRoutes } from 'react-router-dom';
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
import Dashboard from '../pages/Dashboard'; // Import our new Dashboard component

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

// App Routes Configuration
const AppRoutes: React.FC = () => {
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
          <MainLayout>
            <Outlet />
          </MainLayout>
        </AuthGuard>
      ),
      children: [
        {
          path: '/',
          element: <Navigate to="/dashboard" replace />,
        },
        {
          path: '/dashboard',
          element: <Dashboard />,
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