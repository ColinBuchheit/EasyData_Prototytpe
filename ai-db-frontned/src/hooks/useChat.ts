// src/hooks/useChat.ts
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { 
  createChatSession, 
  setCurrentSession, 
  addMessage, 
  clearMessages, 
  deleteSession 
} from '../store/slices/chatSlice';
import { wsConnect, wsSendQuery } from '../store/middleware/websocketMiddleware';
import { Message } from '../types/chat.types';
import { getToken } from '../utils/auth.utils';

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

  const initializeWebSocket = useCallback(() => {
    const token = getToken();
    if (token) {
      dispatch(wsConnect());
    }
  }, [dispatch]);

  const startNewSession = useCallback(async (title?: string) => {
    try {
      const result = await dispatch(createChatSession(title)).unwrap();
      return result;
    } catch (error) {
      return null;
    }
  }, [dispatch]);

  const switchSession = useCallback((sessionId: string) => {
    dispatch(setCurrentSession(sessionId));
  }, [dispatch]);

  const sendMessage = useCallback((content: string) => {
    // Add user message to chat
    dispatch(addMessage({
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }));
    
    // Send message to backend through WebSocket
    const dbId = selectedConnection?.id;
    dispatch(wsSendQuery(content, dbId));
  }, [dispatch, selectedConnection]);

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