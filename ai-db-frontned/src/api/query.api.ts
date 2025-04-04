// src/api/query.api.ts
import apiClient from './index';
import { 
  NaturalLanguageQueryRequest, 
  QueryRequest,
  QueryResponse,
  QueryHistory 
} from '../types/query.types';

export const queryApi = {
  // Execute a direct SQL query
  executeQuery: async (query: QueryRequest): Promise<QueryResponse> => {
    const response = await apiClient.post('/query/execute', query);
    return response.data;
  },
  
  // Process natural language query through AI
  processNaturalLanguageQuery: async (request: NaturalLanguageQueryRequest): Promise<QueryResponse> => {
    const response = await apiClient.post('/query/ai', request);
    return response.data;
  },
  
  // Execute query across multiple databases
  executeMultiDbQuery: async (task: string, dbIds: number[]): Promise<any> => {
    const response = await apiClient.post('/query/multi', { task, dbIds });
    return response.data;
  },
  
  // Get query history
  getQueryHistory: async (limit: number = 10, dbId?: number): Promise<{ success: boolean; history: QueryHistory[] }> => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (dbId) {
      params.append('dbId', dbId.toString());
    }
    
    const response = await apiClient.get(`/query/history?${params.toString()}`);
    return response.data;
  },
  
  // Get current database context
  getCurrentContext: async (): Promise<{ success: boolean; context: any }> => {
    const response = await apiClient.get('/query/context');
    return response.data;
  },
  
  // Set current database context
  setCurrentContext: async (dbId: number): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/query/context', { dbId });
    return response.data;
  },
  
  // Check AI agent health
  checkAIAgentHealth: async (): Promise<{ success: boolean; status: string; message: string }> => {
    const response = await apiClient.get('/query/ai/health');
    return response.data;
  }
};