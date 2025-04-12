// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchUserConnections } from '../store/slices/databaseSlice';
import { fetchQueryHistory } from '../store/slices/querySlice';
import { createChatSession } from '../store/slices/chatSlice';
// Removed MainLayout import

// Components
import Spinner from '../components/common/Spinner';

// Import all widgets from the barrel file
import {
  WelcomeWidget,
  DbSummaryWidget,
  RecentQueriesWidget,
  ConnectionStatusWidget,
  QuickActionsWidget,
  SystemStatusWidget
} from '../components/dashboard';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { connections, loading: dbLoading } = useAppSelector(state => state.database);
  const { history, loading: queryLoading } = useAppSelector(state => state.query);
  const { user } = useAppSelector(state => state.auth);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        dispatch(fetchUserConnections()),
        dispatch(fetchQueryHistory({ limit: 5 }))
      ]);
      // Add a small delay to show the loading animation
      setTimeout(() => setIsInitialLoad(false), 800);
    };
    
    loadData();
  }, [dispatch]);

  const handleNewChat = async () => {
    try {
      // Create chat session with default title "New Chat"
      const session = await dispatch(createChatSession("New Chat")).unwrap();
      if (session) {
        navigate('/chat');
      }
    } catch (error) {
      console.error('Failed to create new chat session', error);
    }
  };

  // Loading state
  if (isInitialLoad) {
    return (
      // Removed MainLayout wrapper
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Spinner size="xl" />
          <p className="mt-4 text-zinc-400 text-center">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Dashboard Header */}
      <header className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-zinc-100">
            Dashboard
          </h1>
          <p className="text-zinc-400 mt-2">
            Welcome back{user?.username ? `, ${user.username}` : ''}! Here's an overview of your databases and recent activity.
          </p>
        </motion.div>
      </header>
      
      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <motion.div 
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Welcome Banner */}
          <WelcomeWidget onNewChat={handleNewChat} />
          
          {/* Database Summary */}
          <DbSummaryWidget connections={connections} />
          
          {/* Recent Queries */}
          <RecentQueriesWidget history={history} loading={queryLoading} />
        </motion.div>
        
        {/* Right Column */}
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* Connection Status */}
          <ConnectionStatusWidget connections={connections} loading={dbLoading} />
          
          {/* Quick Actions */}
          <QuickActionsWidget onNewChat={handleNewChat} />
          
          {/* System Status */}
          <SystemStatusWidget />
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;