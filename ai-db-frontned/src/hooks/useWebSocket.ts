// src/hooks/useWebSocket.ts
import { useState, useEffect, useCallback } from 'react';
import { websocketService } from '../api/websocket.api';
import { getToken } from '../utils/auth.utils';

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
      const connected = await websocketService.connect(token);
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
    websocketService.disconnect();
    setStatus('disconnected');
  }, []);

  // Send a message through WebSocket
  const sendMessage = useCallback((type: string, data: any) => {
    return websocketService.sendMessage(type, data);
  }, []);

  // Send a query through WebSocket
  const sendQuery = useCallback((task: string, dbId?: number) => {
    return websocketService.sendNaturalLanguageQuery(task, dbId);
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