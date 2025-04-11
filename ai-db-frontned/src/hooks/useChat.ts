// src/hooks/useChat.ts
import { useCallback, useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { 
  createChatSession, 
  setCurrentSession, 
  addMessage, 
  clearMessages, 
  deleteSession,
  updateQueryStatus
} from '../store/slices/chatSlice';
import { chatService } from '../api/chat.service';
import { Message } from '../types/chat.types';
import { addToast } from '../store/slices/uiSlice';
import { QueryStatus } from '../types/query.types';
import { v4 as uuidv4 } from 'uuid';

export const useChat = () => {
  const dispatch = useAppDispatch();
  const { 
    sessions, 
    currentSessionId, 
    messages, 
    status, 
    error 
  } = useAppSelector(state => state.chat);
  const { selectedConnection } = useAppSelector(state => state.database);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(async () => {
    const connected = await chatService.connect();
    setIsConnected(connected);
    
    // Register event listeners
    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);
    
    chatService.addEventListener('connected', handleConnected);
    chatService.addEventListener('disconnected', handleDisconnected);
    
    return connected;
  }, []);

  // Connect when the hook is first used
  useEffect(() => {
    // Only initialize if not already connected
    if (!isConnected) {
      initializeWebSocket();
    }
    
    // Clean up on unmount
    return () => {
      // Don't disconnect the WebSocket since we might want to keep it active
      // Just remove event listeners
      chatService.removeEventListener('connected', () => setIsConnected(true));
      chatService.removeEventListener('disconnected', () => setIsConnected(false));
    };
  }, [initializeWebSocket, isConnected]);

  // In useChat.ts, change this line:
// in src/hooks/useChat.ts
const startNewSession = useCallback(async (title?: string) => {
  try {
    // Ensure we're connected before creating a session
    if (!isConnected) {
      await initializeWebSocket();
    }
    
    const sessionId = uuidv4();
    // Fix the parameter format to match what createChatSession expects
    const session = await dispatch(createChatSession({
      title: title || 'New Chat',
      sessionId
    })).unwrap();
    
    // Don't send 'newSession' message as it's not supported by the backend
    // Just log the session creation locally
    console.log('Created new chat session locally:', session.id);
    
    return session;
  } catch (error) {
    console.error("Failed to create chat session:", error);
    dispatch(addToast({
      type: 'error',
      message: 'Failed to create new chat session'
    }));
    return null;
  }
}, [dispatch, initializeWebSocket, isConnected]);
  const switchSession = useCallback((sessionId: string) => {
    dispatch(setCurrentSession(sessionId));
    
    // Notify server about session switch
    chatService.sendMessage('switchSession', { sessionId });
  }, [dispatch]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    
    const dbId = selectedConnection?.id;
    
    // Ensure we have a session before sending
    if (!currentSessionId) {
      startNewSession("New Chat").then(session => {
        if (session) {
          // Now send the message
          sendQueryWithRetry(content, dbId);
        }
      });
    } else {
      sendQueryWithRetry(content, dbId);
    }
  }, [currentSessionId, selectedConnection?.id, startNewSession]);
  
  // Helper to send query with connection retry
  const sendQueryWithRetry = useCallback(async (content: string, dbId?: number) => {
    // First update UI to show we're processing
    dispatch(updateQueryStatus({ 
      status: QueryStatus.PROCESSING, 
      message: 'Processing your query...' 
    }));
    
    // Add user message to chat
    dispatch(addMessage({
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }));
    
    // Connect if not already connected
    if (!isConnected) {
      const connected = await initializeWebSocket();
      if (!connected) {
        // Add error message if connection fails
        dispatch(addMessage({
          id: uuidv4(),
          role: 'assistant',
          content: 'Unable to connect to the chat service. Please try again later.',
          timestamp: new Date().toISOString(),
          error: 'Connection failed'
        }));
        
        dispatch(updateQueryStatus({ 
          status: QueryStatus.FAILED, 
          message: 'Connection failed' 
        }));
        
        dispatch(addToast({
          type: 'error',
          message: 'Unable to connect to chat service'
        }));
        return;
      }
    }
    
    // Send the query
    const success = chatService.sendQuery(content, dbId);
    if (!success) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to send message'
      }));
    }
  }, [dispatch, initializeWebSocket, isConnected]);
  const removeSession = useCallback((sessionId: string) => {
    dispatch(deleteSession(sessionId));
    
    // Notify server about session deletion
    chatService.sendMessage('deleteSession', { sessionId });
  }, [dispatch]);

  const clearChat = useCallback(() => {
    dispatch(clearMessages());
    
    // Notify server about clearing chat
    if (currentSessionId) {
      chatService.sendMessage('clearSession', { sessionId: currentSessionId });
    }
  }, [dispatch, currentSessionId]);

  const addCustomMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    dispatch(addMessage({
      ...message,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    }));
  }, [dispatch]);

  return {
    sessions,
    currentSessionId,
    messages,
    status,
    error,
    isConnected,
    initializeWebSocket,
    startNewSession,
    switchSession,
    sendMessage,
    removeSession,
    clearChat,
    addCustomMessage
  };
};

export default useChat;