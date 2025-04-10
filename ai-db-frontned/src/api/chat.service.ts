// src/api/chat.service.ts
import { v4 as uuidv4 } from 'uuid';
import { addMessage, updateQueryStatus } from '../store/slices/chatSlice';
import { addProgressUpdate } from '../store/slices/querySlice';
import { store } from '../store';
import { getToken } from '../utils/authService';
import { QueryStatus, ProgressUpdateType } from '../types/query.types';
import { addToast } from '../store/slices/uiSlice';

export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  error?: string;
}

export class ChatService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: Array<{type: string, data: any}> = [];
  private isConnecting = false;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  constructor(private url: string) {}

  public async connect(): Promise<boolean> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return true;
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
      const token = getToken();
      if (!token) {
        this.isConnecting = false;
        resolve(false);
        return;
      }

      try {
        this.socket = new WebSocket(`${this.url}?token=${token}`);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          
          // Send any queued messages
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            if (msg) this.sendMessage(msg.type, msg.data);
          }
          
          // Notify listeners
          this.notifyListeners('connected', { connected: true });
          
          resolve(true);
        };

        this.socket.onclose = () => {
          console.log('WebSocket disconnected');
          this.socket = null;
          this.isConnecting = false;
          this.attemptReconnect();
          
          // Notify listeners
          this.notifyListeners('disconnected', { connected: false });
          
          // Notify the user of disconnection
          store.dispatch(updateQueryStatus({ 
            status: QueryStatus.FAILED, 
            message: 'Connection lost. Attempting to reconnect...' 
          }));
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          
          // Notify listeners
          this.notifyListeners('error', { error });
          
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

  public sendMessage(type: string, data: any): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      // Queue the message if not connected
      this.messageQueue.push({ type, data });
      
      // Try to connect
      this.connect();
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

  public sendQuery(task: string, dbId?: number): boolean {
    store.dispatch(updateQueryStatus({ 
      status: QueryStatus.PROCESSING, 
      message: 'Processing your query...' 
    }));
    
    // Add user message to chat
    store.dispatch(addMessage({
      id: uuidv4(),
      role: 'user',
      content: task,
      timestamp: new Date().toISOString()
    }));
    
    return this.sendMessage('query', { task, dbId });
  }

  public sendNaturalLanguageQuery(task: string, dbId?: number): boolean {
    return this.sendQuery(task, dbId);
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.messageQueue = [];
    
    // Notify listeners
    this.notifyListeners('disconnected', { connected: false });
  }

  // Add event listener
  public addEventListener(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)?.push(callback);
  }

  // Remove event listener
  public removeEventListener(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notify listeners
  private notifyListeners(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Notify any registered listeners for this message type
      this.notifyListeners(message.type, message.data);

      switch (message.type) {
        case 'processing':
          store.dispatch(updateQueryStatus({ 
            status: QueryStatus.PROCESSING, 
            message: message.message 
          }));
          break;

        case 'progressUpdate':
          if (message.data && typeof message.data.type === 'string') {
            store.dispatch(addProgressUpdate({
              type: message.data.type as ProgressUpdateType,
              message: message.data.message || 'Processing...',
              details: message.data.details
            }));
          }
          break;

        case 'streamResponse':
          // Handle streaming response
          if (message.data && message.data.content) {
            store.dispatch(addMessage({
              id: message.data.id || uuidv4(),
              role: 'assistant',
              content: message.data.content,
              timestamp: new Date().toISOString(),
              isStreaming: true
            }));
          }
          break;

        case 'queryResult':
          store.dispatch(addMessage({
            id: uuidv4(),
            role: 'assistant',
            content: message.data.explanation || 'Query executed successfully',
            timestamp: new Date().toISOString(),
            queryResult: message.data,
            isStreaming: false
          }));
          store.dispatch(updateQueryStatus({ status: QueryStatus.COMPLETED }));
          break;

        case 'error':
          store.dispatch(addMessage({
            id: uuidv4(),
            role: 'assistant',
            content: `Error: ${message.message || 'An error occurred'}`,
            timestamp: new Date().toISOString(),
            error: message.error
          }));
          store.dispatch(updateQueryStatus({ 
            status: QueryStatus.FAILED,
            message: message.message || 'An error occurred'
          }));
          break;

        case 'contextSwitch':
          store.dispatch(addMessage({
            id: uuidv4(),
            role: 'assistant',
            content: message.message || '',
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

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      
      // Notify user about connection failure
      store.dispatch(addToast({
        type: 'error',
        message: 'Unable to connect to server. Please refresh the page.'
      }));
      
      return;
    }

    const delay = Math.min(1000 * (2 ** this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect in ${delay}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    // Notify user about reconnection attempt
    if (this.reconnectAttempts > 1) {
      store.dispatch(addToast({
        type: 'info',
        message: `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      }));
    }

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  // Check if connected
  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

// Create and export a singleton instance
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3000/ws`;
export const chatService = new ChatService(WS_URL);

// Export default for backward compatibility
export default chatService;