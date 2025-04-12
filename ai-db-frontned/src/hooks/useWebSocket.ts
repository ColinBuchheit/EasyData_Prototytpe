// src/hooks/useWebSocket.ts
import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../api/chat.service';
import { getToken } from '../utils/authService';

type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseWebSocketReturn {
  status: WebSocketStatus;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sendMessage: (type: string, data: any) => boolean;
  sendQuery: (task: string, dbId?: number) => boolean;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');

  // Connect to WebSocket
  const connect = useCallback(async () => {
    setStatus('connecting');
    const token = getToken();
    
    if (!token) {
      setStatus('error');
      return false;
    }
    
    try {
      const connected = await chatService.connect();
      setStatus(connected ? 'connected' : 'error');
      return connected;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setStatus('error');
      return false;
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    chatService.disconnect();
    setStatus('disconnected');
  }, []);

  // Send a message through WebSocket
  const sendMessage = useCallback((type: string, data: any) => {
    return chatService.sendMessage(type, data);
  }, []);

  // Send a query through WebSocket
  const sendQuery = useCallback((task: string, dbId?: number) => {
    return chatService.sendQuery(task, dbId);
  }, []);

  // Set up WebSocket event listeners
  useEffect(() => {
    const handleConnected = () => setStatus('connected');
    const handleDisconnected = () => setStatus('disconnected');
    const handleError = () => setStatus('error');
    
    chatService.addEventListener('connected', handleConnected);
    chatService.addEventListener('disconnected', handleDisconnected);
    chatService.addEventListener('error', handleError);
    
    return () => {
      chatService.removeEventListener('connected', handleConnected);
      chatService.removeEventListener('disconnected', handleDisconnected);
      chatService.removeEventListener('error', handleError);
    };
  }, []);

  // Connect on mount if token exists
  useEffect(() => {
    const token = getToken();
    if (token) {
      connect();
    }

    // Clean up on component unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    connect,
    disconnect,
    sendMessage,
    sendQuery
  };
};

export default useWebSocket;