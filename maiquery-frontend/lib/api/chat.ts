// lib/api/chat.ts
import apiClient from './cleint ';
import { ChatMessage, ChatResponse, NaturalLanguageQueryRequest } from '../types/chat'

// Send a natural language query to the backend
export const sendQuery = async (request: NaturalLanguageQueryRequest): Promise<ChatResponse> => {
  try {
    const response = await apiClient.post('/query/ai', request);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
};

// Get query history
export const getQueryHistory = async (limit = 10, dbId?: number): Promise<any> => {
  try {
    const params: Record<string, any> = { limit };
    if (dbId) params.dbId = dbId;
    
    const response = await apiClient.get('/query/history', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch query history:', error);
    throw error;
  }
};

// Execute a raw SQL query (for advanced users)
export const executeRawQuery = async (dbId: number, query: string): Promise<any> => {
  try {
    const response = await apiClient.post('/query/execute', { dbId, query });
    return response.data;
  } catch (error) {
    console.error('Failed to execute query:', error);
    throw error;
  }
};

// Get the current database context
export const getCurrentContext = async (): Promise<any> => {
  try {
    const response = await apiClient.get('/query/context');
    return response.data;
  } catch (error) {
    console.error('Failed to get current context:', error);
    throw error;
  }
};

// Set current database context
export const setCurrentContext = async (dbId: number): Promise<any> => {
  try {
    const response = await apiClient.post('/query/context', { dbId });
    return response.data;
  } catch (error) {
    console.error('Failed to set context:', error);
    throw error;
  }
};