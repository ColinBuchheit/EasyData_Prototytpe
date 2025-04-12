// src/api/database.api.ts
import apiClient from './index';
import { 
  DbConnection,
  ConnectionTestResult,
  DbSchema,
  DbMetadata,
  DbConnectionRequest 
} from '../types/database.types';

export const databaseApi = {
  // Create a new database connection
  createConnection: async (connectionData: DbConnectionRequest): Promise<{
    message: string; success: boolean; data: DbConnection 
  }> => {
    // Log the data being sent to help with debugging
    console.log('Sending connection data:', connectionData);
    
    // Make sure data is correctly formatted before sending
    const formattedData = {
      dbType: connectionData.dbType,
      host: connectionData.host,
      port: connectionData.port,
      username: connectionData.username,
      password: connectionData.password,
      dbName: connectionData.dbName,
      connectionName: connectionData.connectionName || undefined
    };
    
    const response = await apiClient.post('/database/connections', formattedData);
    return response.data;
  },
  
  // Test database connection before saving
  testConnection: async (connectionData: DbConnectionRequest): Promise<ConnectionTestResult> => {
    // Format data before sending
    const formattedData = {
      dbType: connectionData.dbType,
      host: connectionData.host,
      port: connectionData.port,
      username: connectionData.username,
      password: connectionData.password,
      dbName: connectionData.dbName,
      connectionName: connectionData.connectionName || undefined
    };
    
    const response = await apiClient.post('/database/connections/test', formattedData);
    return response.data;
  },
  
  // Get all user's database connections
  getUserConnections: async (): Promise<{
    message: string; success: boolean; data: DbConnection[] 
  }> => {
    const response = await apiClient.get('/database/connections');
    return response.data;
  },
  
  // Remaining methods stay the same
  getConnection: async (id: number): Promise<{ success: boolean; data: DbConnection }> => {
    const response = await apiClient.get(`/database/connections/${id}`);
    return response.data;
  },
  
  updateConnection: async (id: number, data: Partial<DbConnectionRequest>): Promise<{ success: boolean; data: DbConnection }> => {
    const response = await apiClient.put(`/database/connections/${id}`, data);
    return response.data;
  },
  
  deleteConnection: async (id: number): Promise<{
    message: string; success: boolean 
  }> => {
    const response = await apiClient.delete(`/database/connections/${id}`);
    return response.data;
  },
  
  getDatabaseMetadata: async (id: number): Promise<{
    message: string; success: boolean; data: DbMetadata 
  }> => {
    const response = await apiClient.get(`/database/schema/metadata/${id}`);
    return response.data;
  },
  
  refreshDatabaseMetadata: async (id: number): Promise<{ success: boolean; data: DbMetadata }> => {
    const response = await apiClient.post(`/database/schema/metadata/${id}/refresh`);
    return response.data;
  },
  
  checkConnectionHealth: async (id: number): Promise<{
    message: string; success: boolean; status: any 
  }> => {
    const response = await apiClient.get(`/database/health/connection/${id}`);
    return response.data;
  },
  
  getUnifiedSchema: async (id: number): Promise<{
    message: string; success: boolean; schema: DbSchema 
  }> => {
    const response = await apiClient.get(`/database/schema/unified/${id}`);
    return response.data;
  }
};