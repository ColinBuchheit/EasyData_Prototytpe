import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAppDispatch } from './hooks/useRedux';
import { wsConnect } from './store/middleware/websocketMiddleware';
import AppRoutes from './routes/index';
import { useTheme } from './hooks/useTheme';
import ToastContainer from './components/common/Toast';
import { checkApiHealth } from './utils/api-health';

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Initialize theme
  useTheme();
  
  // Check API health on startup
  useEffect(() => {
    const runHealthCheck = async () => {
      await checkApiHealth();
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
      <div className="min-h-screen bg-background text-text-primary">
        <AppRoutes />
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
};

export default App;