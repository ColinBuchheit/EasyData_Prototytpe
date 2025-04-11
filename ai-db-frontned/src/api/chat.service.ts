// src/api/chat.service.ts
import { v4 as uuidv4 } from 'uuid';
import { addMessage, updateQueryStatus } from '../store/slices/chatSlice';
import { addProgressUpdate, clearProgressUpdates } from '../store/slices/querySlice';
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
  private pingInterval: NodeJS.Timeout | null = null;
  private messageQueue: Array<{type: string, data: any}> = [];
  private isConnecting = false;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  constructor(private url: string) {}

  public async connect(): Promise<boolean> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return true;
    }

    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            clearInterval(checkInterval);
            resolve(true);
          } else if (!this.isConnecting) {
            clearInterval(checkInterval);
            resolve(false);
          }
        }, 100);
      });
    }

    this.isConnecting = true;
    console.log('Attempting to connect to WebSocket');

    return new Promise((resolve) => {
      const token = getToken();
      if (!token) {
        console.error('No authentication token available');
        this.isConnecting = false;
        resolve(false);
        return;
      }

      try {
        // Include token in the connection URL
        this.socket = new WebSocket(`${this.url}?token=${token}`);
        console.log('WebSocket constructor called, waiting for connection');

        this.socket.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          
          // Start ping interval to keep connection alive
          this.startPingInterval();
          
          // Send any queued messages
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            if (msg) {
              console.log('Sending queued message:', msg);
              this.sendMessage(msg.type, msg.data);
            }
          }
          
          // Notify listeners
          this.notifyListeners('connected', { connected: true });
          
          resolve(true);
        };

        this.socket.onclose = (event) => {
          console.log(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
          this.socket = null;
          this.isConnecting = false;
          this.stopPingInterval();
          this.attemptReconnect();
          
          // Notify listeners
          this.notifyListeners('disconnected', { 
            connected: false,
            code: event.code,
            reason: event.reason 
          });
          
          // Notify the user of disconnection only if it was an abnormal closure
          if (event.code !== 1000 && event.code !== 1001) {
            store.dispatch(updateQueryStatus({ 
              status: QueryStatus.FAILED, 
              message: 'Connection lost. Attempting to reconnect...' 
            }));
            
            store.dispatch(addToast({
              type: 'warning',
              message: 'Connection to server lost. Attempting to reconnect...'
            }));
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          
          // Notify listeners
          this.notifyListeners('error', { error });
          
          resolve(false);
        };

        this.socket.onmessage = (event) => {
          console.log('Received message from server:', event.data);
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
    // Log message before sending
    console.log(`Attempting to send WebSocket message type: '${type}'`);
    console.log('Message data:', data);
    console.log('WebSocket state:', this.socket ? 
      ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.socket.readyState] : 'null');
    
    // Check if socket is open
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not open, queueing message');
      this.messageQueue.push({ type, data });
      
      // Try to connect
      this.connect();
      return false;
    }

    try {
      // Format data properly ensuring numbers are numbers, not objects or strings
      if (data && typeof data === 'object') {
        if (data.dbId !== undefined) {
          data.dbId = Number(data.dbId) || null;
        }
      }
      
      const messageStr = JSON.stringify({ type, data });
      console.log('Sending WebSocket message:', messageStr);
      this.socket.send(messageStr);
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  // Modified sendQuery function for chat.service.ts
public sendQuery(task: string, dbId?: number): boolean {
  // Ensure dbId is a proper number if provided
  const parsedDbId = dbId !== undefined ? Number(dbId) : undefined;
  
  // Validate dbId is actually a number and not NaN
  if (parsedDbId !== undefined && isNaN(parsedDbId)) {
    console.error('Invalid database ID provided:', dbId);
    store.dispatch(addToast({
      type: 'error',
      message: 'Invalid database ID format'
    }));
    return false;
  }
  
  // Update UI state to show processing
  store.dispatch(updateQueryStatus({ 
    status: QueryStatus.PROCESSING, 
    message: 'Processing your query...' 
  }));
  
  // Clear any previous progress updates
  store.dispatch(clearProgressUpdates());
  
  // Get current state
  const state = store.getState();
  
  // Add user message to chat if needed
  const lastMessage = state.chat.messages[state.chat.messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== task) {
    store.dispatch(addMessage({
      id: uuidv4(),
      role: 'user',
      content: task,
      timestamp: new Date().toISOString()
    }));
  }
  
  // Prepare message payload - only include dbId if it's valid
  const messagePayload: any = { 
    task, 
    sessionId: state.chat.currentSessionId 
  };
  
  // Add dbId to payload only if it's a valid number
  if (parsedDbId !== undefined) {
    messagePayload.dbId = parsedDbId;
  }
  
  console.log('Sending query with payload:', messagePayload);
  
  // Send the message with proper payload
  return this.sendMessage('query', messagePayload);
}

  public sendNaturalLanguageQuery(task: string, dbId?: number): boolean {
    return this.sendQuery(task, dbId);
  }

  public disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting WebSocket');
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopPingInterval();
    this.messageQueue = [];
    
    // Notify listeners
    this.notifyListeners('disconnected', { connected: false });
  }

  // Ping to keep connection alive
  public startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        console.log('Sending ping to keep connection alive');
        this.sendMessage('ping', { timestamp: Date.now() });
      }
    }, 30000);
  }

  // Stop ping interval
  public stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
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
      console.log('Received WebSocket message:', event.data);
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Log parsed message
      console.log('Parsed WebSocket message type:', message.type);
      console.log('Message data:', message.data);
      console.log('Message content:', message.message || 'no message');
      
      // Notify any registered listeners for this message type
      this.notifyListeners(message.type, message.data);

      switch (message.type) {
        case 'pong':
          // Handle pong response (connection heartbeat)
          console.debug('Received pong from server', message.data);
          break;

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
            
            // If the progress update is an error, also update query status
            if (message.data.type === ProgressUpdateType.ERROR) {
              store.dispatch(updateQueryStatus({ 
                status: QueryStatus.FAILED,
                message: message.data.message || 'An error occurred'
              }));
            }
          }
          break;

        case 'streamResponse':
          // Handle streaming response
          if (message.data && message.data.content) {
            store.dispatch(updateQueryStatus({ 
              status: QueryStatus.STREAMING
            }));
            
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
          // If a streaming message was in progress, mark it as complete
          const state = store.getState();
          const lastMessage = state.chat.messages[state.chat.messages.length - 1];
          
          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
            // Final response - replace streaming message
            store.dispatch(addMessage({
              id: lastMessage.id, // Use same ID to replace
              role: 'assistant',
              content: message.data.explanation || lastMessage.content || 'Query executed successfully',
              timestamp: new Date().toISOString(),
              queryResult: message.data,
              isStreaming: false
            }));
          } else {
            // No streaming message - add new one
            store.dispatch(addMessage({
              id: uuidv4(),
              role: 'assistant',
              content: message.data.explanation || 'Query executed successfully',
              timestamp: new Date().toISOString(),
              queryResult: message.data,
              isStreaming: false
            }));
          }
          
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
          
          // Show toast for severe errors
          if (message.error && message.error.includes('database')) {
            store.dispatch(addToast({
              type: 'error',
              message: message.message || 'Database error occurred'
            }));
          }
          break;

        case 'contextSwitch':
          store.dispatch(addMessage({
            id: uuidv4(),
            role: 'system',
            content: message.message || 'Switched database context',
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
  
  // Debug method to test connection
  public testConnection(): boolean {
    console.log('Testing WebSocket connection');
    return this.sendMessage('ping', { timestamp: Date.now() });
  }
}

// Create and export a singleton instance
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3000/ws`;
export const chatService = new ChatService(WS_URL);

// Export default for backward compatibility
export default chatService;