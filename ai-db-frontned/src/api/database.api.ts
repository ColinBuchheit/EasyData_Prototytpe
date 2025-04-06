// src/api/database.api.ts
import apiClient from './index';
import { 
  DbConnectionRequest, 
  DbConnection,
  ConnectionTestResult,
  DbSchema,
  DbMetadata 
} from '../types/database.types';

export const databaseApi = {
  // Create a new database connection
  createConnection: async (connectionData: DbConnectionRequest): Promise<{
    message: string; success: boolean; data: DbConnection 
}> => {
    const response = await apiClient.post('/database/connections', connectionData);
    return response.data;
  },
  
  // Test database connection before saving
  testConnection: async (connectionData: DbConnectionRequest): Promise<ConnectionTestResult> => {
    const response = await apiClient.post('/database/connections/test', connectionData);
    return response.data;
  },
  
  // Get all user's database connections
  getUserConnections: async (): Promise<{
    message: string; success: boolean; data: DbConnection[] 
}> => {
    const response = await apiClient.get('/database/connections');
    return response.data;
  },
  
  // Get a specific database connection
  getConnection: async (id: number): Promise<{ success: boolean; data: DbConnection }> => {
    const response = await apiClient.get(`/database/connections/${id}`);
    return response.data;
  },
  
  // Update a database connection
  updateConnection: async (id: number, data: Partial<DbConnectionRequest>): Promise<{ success: boolean; data: DbConnection }> => {
    const response = await apiClient.put(`/database/connections/${id}`, data);
    return response.data;
  },
  
  // Delete a database connection
  deleteConnection: async (id: number): Promise<{
    message: string; success: boolean 
}> => {
    const response = await apiClient.delete(`/database/connections/${id}`);
    return response.data;
  },
  
  // Get database schema metadata
  getDatabaseMetadata: async (id: number): Promise<{
    message: string; success: boolean; data: DbMetadata 
}> => {
    const response = await apiClient.get(`/database/schema/metadata/${id}`);
    return response.data;
  },
  
  // Refresh database schema metadata (force re-analysis)
  refreshDatabaseMetadata: async (id: number): Promise<{ success: boolean; data: DbMetadata }> => {
    const response = await apiClient.post(`/database/schema/metadata/${id}/refresh`);
    return response.data;
  },
  
  // Get database health status
  checkConnectionHealth: async (id: number): Promise<{
    message: string; success: boolean; status: any 
}> => {
    const response = await apiClient.get(`/database/health/connection/${id}`);
    return response.data;
  },
  
  // Get unified schema (enhanced schema with relationships, etc)
  getUnifiedSchema: async (id: number): Promise<{
    message: string; success: boolean; schema: DbSchema 
}> => {
    const response = await apiClient.get(`/database/schema/unified/${id}`);
    return response.data;
  }
};