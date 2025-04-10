// src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './hooks/useRedux';
import { wsConnect } from './store/middleware/websocketMiddleware';
import AppRoutes from './routes/index';
import { useTheme } from './hooks/useTheme';
import ToastContainer from './components/common/Toast';
import { checkApiHealth } from './utils/api-health';
import { verifyAuthOnStartup } from './utils/auth-verification';
import { getToken } from './utils/auth.utils';

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const [authVerified, setAuthVerified] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const { isAuthenticated } = useAppSelector(state => state.auth);
  
  // Initialize theme
  useTheme();
  
  // Verify authentication on startup
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await verifyAuthOnStartup();
      } catch (error) {
        console.error("Auth verification error:", error);
      } finally {
        setAuthVerified(true);
        setInitializing(false);
      }
    };
    
    verifyAuth();
  }, []);
  
  // Check API health on startup - but only once authentication is verified
  useEffect(() => {
    if (authVerified) {
      const runHealthCheck = async () => {
        try {
          await checkApiHealth();
        } catch (error) {
          console.error("Health check error:", error);
          // Fail silently - health issues will be shown in the SystemStatusWidget
        }
      };
      
      runHealthCheck();
    }
  }, [authVerified]);
  
  // Initialize WebSocket connection for authenticated users
  // Only do this after auth verification to prevent unnecessary connection attempts
  useEffect(() => {
    if (authVerified && isAuthenticated) {
      const token = getToken();
      if (token) {
        dispatch(wsConnect());
      }
    }
  }, [dispatch, authVerified, isAuthenticated]);

  // Loading screen while initializing
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <p className="text-zinc-400">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <AppRoutes />
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
};

export default App;