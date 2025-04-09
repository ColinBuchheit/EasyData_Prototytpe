// src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAppDispatch } from './hooks/useRedux';
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
  
  // Initialize theme
  useTheme();
  
  // Verify authentication on startup
  useEffect(() => {
    const verifyAuth = async () => {
      await verifyAuthOnStartup();
      setAuthVerified(true);
    };
    
    verifyAuth();
  }, []);
  
  // Check API health on startup
  useEffect(() => {
    const runHealthCheck = async () => {
      await checkApiHealth();
    };
    
    runHealthCheck();
  }, []);
  
  // Initialize WebSocket connection for authenticated users
  useEffect(() => {
    const token = getToken();
    if (token) {
      dispatch(wsConnect());
    }
  }, [dispatch]);

  // Only render routes after auth verification is complete
  if (!authVerified) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-text-primary">
        <AppRoutes />
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
};



export default App;