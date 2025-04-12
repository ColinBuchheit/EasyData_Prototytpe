// src/types/chat.types.ts
import { QueryResponse } from './query.types';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  queryResult?: QueryResponse;
  error?: string;
  contextSwitch?: { dbId: number };
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: Message[];
  status: 'idle' | 'loading' | 'success' | 'error' | 'streaming';
  error: string | null;
}
