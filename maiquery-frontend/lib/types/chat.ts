// lib/types/chat.ts

// Database connection type
export interface Database {
    id: number;
    name: string;
    connectionName?: string;
    dbType: string;
    isConnected: boolean;
  }
  
  // Chat message role
  export type MessageRole = 'user' | 'assistant' | 'system' | 'error';
  
  // Chat message model
  export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    query?: string;
    visualizationCode?: string;
    results?: any[];
    executionTimeMs?: number;
    rowCount?: number;
    dbId?: number;
    error?: string;
    isLoading?: boolean;
  }
  
  // Request for natural language query
  export interface NaturalLanguageQueryRequest {
    task: string;
    dbId?: number;
    visualize?: boolean;
    refresh?: boolean;
  }
  
  // Response from the AI
  export interface ChatResponse {
    success: boolean;
    query?: string;
    explanation?: string;
    results?: any[];
    visualizationCode?: string;
    executionTimeMs?: number;
    rowCount?: number;
    message?: string;
    error?: string;
    contextSwitched?: boolean;
    dbId?: number;
    cached?: boolean;
  }
  
  // Conversation structure
  export interface Conversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
    dbId?: number;
  }
  
  // Context data
  export interface QueryContext {
    currentDbId: number | null;
    lastSwitchTime: Date;
    recentQueries: {
      dbId: number;
      timestamp: Date;
      query: string;
    }[];
  }
  
  // Query history record
  export interface QueryHistoryRecord {
    id?: string;
    dbId: number;
    queryText: string;
    executionTimeMs: number;
    rowCount: number;
    timestamp: Date;
  }