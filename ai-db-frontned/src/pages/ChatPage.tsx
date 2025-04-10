// src/pages/ChatPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { 
  fetchUserConnections, 
  setSelectedConnection 
} from '../store/slices/databaseSlice';
import {
  createChatSession,
  setCurrentSession,
  addMessage,
  clearMessages,
  deleteSession
} from '../store/slices/chatSlice';
import { fetchQueryHistory } from '../store/slices/querySlice';
import ChatContainer from '../components/chat/ChatContainer';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatProgress from '../components/chat/ChatProgress';
import { addToast } from '../store/slices/uiSlice';
import useChat from '../hooks/useChat';
import { Database, Menu, Plus, Settings, X } from 'lucide-react';
import { cn } from '../utils/format.utils';
import Button from '../components/common/Button';
import DatabaseSelector from '../components/database/DatabaseSelector';
import useClickOutside from '../hooks/useClickOutside';

const ChatPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { connections, selectedConnection } = useAppSelector(state => state.database);
  const { sessions, currentSessionId, status } = useAppSelector(state => state.chat);
  const { initializeWebSocket, startNewSession, switchSession, sendMessage } = useChat();
  
  // Local state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [dbSelectorOpen, setDbSelectorOpen] = useState(false);
  const dbSelectorRef = useRef<HTMLDivElement>(null);
  
  // Close DB selector when clicking outside
  useClickOutside(dbSelectorRef, () => setDbSelectorOpen(false));
  
  // Get session ID from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session');
    
    if (sessionId && sessions.some(s => s.id === sessionId) && sessionId !== currentSessionId) {
      dispatch(setCurrentSession(sessionId));
    }
  }, [location.search, sessions, currentSessionId, dispatch]);
  
  // Initialize WebSocket connection
  useEffect(() => {
    initializeWebSocket();
  }, [initializeWebSocket]);
  
  // Fetch connections and query history on mount
  useEffect(() => {
    dispatch(fetchUserConnections());
    dispatch(fetchQueryHistory({ limit: 10 }));
  }, [dispatch]);
  
  // Create new chat session
  const handleNewChat = async () => {
    try {
      const session = await startNewSession("New Chat");
      if (session) {
        // Update URL to include session ID
        navigate(`/chat?session=${session.id}`);
      }
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to create new chat session'
      }));
    }
  };
  
  // Handle connection selection
  const handleSelectConnection = (id: number) => {
    const connection = connections.find(c => c.id === id);
    if (connection) {
      dispatch(setSelectedConnection(connection));
      setDbSelectorOpen(false);
      
      dispatch(addToast({
        type: 'success',
        message: `Connected to ${connection.connection_name || connection.database_name}`
      }));
    }
  };
  
  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };
  
  // Handle session deletion
  const handleDeleteSession = (id: string) => {
    if (id === currentSessionId) {
      // If deleting current session, find another session to switch to
      const otherSession = sessions.find(s => s.id !== id);
      if (otherSession) {
        dispatch(setCurrentSession(otherSession.id));
        navigate(`/chat?session=${otherSession.id}`);
      } else {
        // If no other sessions exist, create a new one
        handleNewChat();
      }
    }
    
    // Delete the session
    dispatch(deleteSession(id));
    
    // Show toast notification
    dispatch(addToast({
      type: 'success',
      message: 'Chat session deleted'
    }));
  };
  
  // Clear current chat
  const handleClearChat = () => {
    dispatch(clearMessages());
    
    dispatch(addToast({
      type: 'info',
      message: 'Chat cleared'
    }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Chat Sidebar - hidden on mobile */}
      <div className={cn(
        "fixed inset-y-0 left-0 lg:relative lg:flex flex-col w-80 border-r border-zinc-800 bg-zinc-900 z-50 transition-transform duration-300 ease-in-out",
        isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Mobile close button */}
        <div className="lg:hidden absolute right-2 top-2">
          <button 
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md"
            onClick={toggleMobileSidebar}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <ChatSidebar 
          onNewChat={handleNewChat}
          onSelectSession={(id: string) => {
            dispatch(setCurrentSession(id));
            navigate(`/chat?session=${id}`);
            setIsMobileSidebarOpen(false);
          }}
          onDeleteSession={handleDeleteSession}
          onClearChat={handleClearChat}
          sessions={sessions}
          currentSessionId={currentSessionId}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Chat header */}
        <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between bg-zinc-900/80 backdrop-blur-sm">
          <div className="flex items-center">
            {/* Mobile menu toggle */}
            <button
              className="lg:hidden mr-2 p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md"
              onClick={toggleMobileSidebar}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* New chat button */}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleNewChat}
            >
              New Chat
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Database selector */}
            <div className="relative" ref={dbSelectorRef}>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Database className="w-4 h-4" />}
                rightIcon={<span className={cn(
                  "w-2 h-2 rounded-full",
                  selectedConnection?.is_connected ? "bg-green-500" : "bg-red-500"
                )}></span>}
                onClick={() => setDbSelectorOpen(!dbSelectorOpen)}
              >
                {selectedConnection ? (
                  selectedConnection.connection_name || selectedConnection.database_name
                ) : (
                  "Select Database"
                )}
              </Button>
              
              {dbSelectorOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    {connections.length === 0 ? (
                      <div className="text-center py-3 text-zinc-400 text-sm">
                        No databases connected.
                        <div className="mt-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate('/databases')}
                          >
                            Add Database
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <DatabaseSelector
                        connections={connections}
                        selectedId={selectedConnection?.id}
                        onSelect={handleSelectConnection}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Settings button */}
            <Button
              variant="ghost"
              size="sm"
              aria-label="Settings"
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Chat container */}
        <ChatContainer />
        
        {/* Progress indicator (floating) */}
        <AnimatePresence>
          {(status === 'loading' || status === 'streaming') && (
            <ChatProgress />
          )}
        </AnimatePresence>
      </div>
      
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={toggleMobileSidebar}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;