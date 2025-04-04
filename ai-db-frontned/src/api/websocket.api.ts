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
  
  // Send a message through WebSocket
  public sendMessage(type: string, data: any): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket not connected');
      return false;
    }
    
    try {
      const message = JSON.stringify({ type, data });
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }
  
  // Process natural language query
  public sendNaturalLanguageQuery(task: string, dbId?: number): boolean {
    return this.sendMessage('query', { task, dbId });
  }
  
  // Disconnect WebSocket
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  // Handle incoming WebSocket messages
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'processing':
          store.dispatch(updateQueryStatus({ status: QueryStatus.PROCESSING, message: message.message }));
          break;
        
        case 'queryResult':
          store.dispatch(addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: message.data.explanation || 'Query executed successfully',
            timestamp: new Date().toISOString(),
            queryResult: message.data
          }));
          store.dispatch(updateQueryStatus({ status: QueryStatus.COMPLETED }));
          break;
        
        case 'error':
          store.dispatch(addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: `Error: ${message.message || 'An error occurred'}`,
            timestamp: new Date().toISOString(),
            error: message.error
          }));
          store.dispatch(updateQueryStatus({ status: QueryStatus.FAILED }));
          break;
        
        case 'contextSwitch':
          store.dispatch(addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: message.message,
            timestamp: new Date().toISOString(),
            contextSwitch: message.data
          }));
          store.dispatch(updateQueryStatus({ status: QueryStatus.COMPLETED }));
          break;
        
        default:
          console.log('Unhandled WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }
  
  // Attempt to reconnect after connection lost
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      return;
    }
    
    const delay = Math.min(1000 * (2 ** this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect in ${delay}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      const token = localStorage.getItem('token');
      if (token) {
        this.connect(token);
      }
    }, delay);
  }
}

// Create and export WebSocket service instance
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3000/ws`;
export const websocketService = new WebSocketService(WS_URL);

export default websocketService;