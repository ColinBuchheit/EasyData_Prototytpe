// src/hooks/useChat.ts
import { useCallback, useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { 
  createChatSession, 
  setCurrentSession, 
  addMessage, 
  clearMessages, 
  deleteSession 
} from '../store/slices/chatSlice';
import { chatService } from '../api/chat.service';
import { Message } from '../types/chat.types';

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
    return connected;
  }, []);

  // Connect when the hook is first used
  useEffect(() => {
    initializeWebSocket();
    
    // Clean up on unmount
    return () => {
      // Don't disconnect the WebSocket since we might want to keep it active
      // Just do any other cleanup needed
    };
  }, [initializeWebSocket]);

  const startNewSession = useCallback(async (title?: string) => {
    try {
      const result = await dispatch(createChatSession(title || 'New Chat')).unwrap();
      return result;
    } catch (error) {
      console.error("Failed to create chat session:", error);
      return null;
    }
  }, [dispatch]);

  const switchSession = useCallback((sessionId: string) => {
    dispatch(setCurrentSession(sessionId));
  }, [dispatch]);

  const sendMessage = useCallback((content: string) => {
    // Add user message to chat (now done in chatService)
    const dbId = selectedConnection?.id;
    
    // Connect if not already connected
    if (!isConnected) {
      initializeWebSocket().then(connected => {
        if (connected) {
          chatService.sendQuery(content, dbId);
        }
      });
    } else {
      chatService.sendQuery(content, dbId);
    }
  }, [isConnected, initializeWebSocket, selectedConnection?.id]);

  const removeSession = useCallback((sessionId: string) => {
    dispatch(deleteSession(sessionId));
  }, [dispatch]);

  const clearChat = useCallback(() => {
    dispatch(clearMessages());
  }, [dispatch]);

  const addCustomMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    dispatch(addMessage({
      ...message,
      id: Date.now().toString(),
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
