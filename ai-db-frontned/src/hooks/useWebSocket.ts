// src/api/websocket.api.ts
import { store } from '../store';
import { addMessage, updateQueryStatus } from '../store/slices/chatSlice';
import { QueryStatus, QueryResult } from '../types/query.types';

export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  
  constructor(private url: string) {}
  
  // Connect to WebSocket server
  public connect(token: string): Promise<boolean> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve(true);
    }
    
    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });
    }
    
    this.isConnecting = true;
    
    return new Promise((resolve) => {
      try {
        // Connect with authentication token
        this.socket = new WebSocket(`${this.url}?token=${token}`);
        
        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve(true);
        };
        
        this.socket.onclose = () => {
          console.log('WebSocket disconnected');
          this.socket = null;
          this.isConnecting = false;
          this.attemptReconnect();
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          resolve(false);
        };
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        this.isConnecting = false;
        resolve(false);
      }
    });
  }
  
  // Get the WebSocket instance
  public getSocket(): WebSocket | null {
    return this.socket;
  }
  
  public getStatus(): 'disconnected' | 'connecting' | 'connected' | 'error' {
    if (this.isConnecting) return 'connecting';
    if (this.socket?.readyState === WebSocket.OPEN) return 'connected';
    if (this.socket?.readyState === WebSocket.CONNECTING) return 'connecting';
    return 'disconnected';
  }
  
  
  export default useWebSocket;