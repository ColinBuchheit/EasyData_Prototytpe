// src/App.tsx (updated)
import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAppDispatch } from './hooks/useRedux';
import { wsConnect } from './store/middleware/websocketMiddleware';
import AppRoutes from './routes/index';
import { useTheme } from './hooks/useTheme';
import ToastContainer from './components/common/Toast';
import { checkApiHealth, HealthCheckResult } from './utils/api-health';

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([]);
  
  // Initialize theme
  useTheme();
  
  // Check API health on startup
  useEffect(() => {
    const runHealthCheck = async () => {
      const results = await checkApiHealth();
      setHealthResults(results);
    };
    
    runHealthCheck();
  }, []);
  
  // Initialize WebSocket connection for authenticated users
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(wsConnect());
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <AppRoutes />
      <ToastContainer />
    </BrowserRouter>
  );
};

export default App;