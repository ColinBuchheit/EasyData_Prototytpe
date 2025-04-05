// src/api/database.api.ts (updated with standardized response handling)
import apiClient from './index';
import { handleApiResponse } from '../utils/api-response';
import { 
  DbConnectionRequest, 
  DbConnection,
  ConnectionTestResult,
  DbSchema,
  DbMetadata 
} from '../types/database.types.';

export const databaseApi = {
  // Create a new database connection
  createConnection: async (connectionData: DbConnectionRequest) => {
    return handleApiResponse<DbConnection>(
      apiClient.post('/database/connections', connectionData),
      {
        successMessage: 'Database connection created successfully',
        errorMessage: 'Failed to create database connection',
        showSuccessToast: true
      }
    );
  },
  
  // Test database connection before saving
  testConnection: async (connectionData: DbConnectionRequest) => {
    return handleApiResponse<ConnectionTestResult>(
      apiClient.post('/database/connections/test', connectionData),
      {
        showSuccessToast: false,
        showErrorToast: false
      }
    );
  },
  
  // Get all user's database connections
  getUserConnections: async () => {
    return handleApiResponse<DbConnection[]>(
      apiClient.get('/database/connections'),
      {
        errorMessage: 'Failed to fetch database connections',
        showSuccessToast: false
      }
    );
  },
  
  // Get a specific database connection
  getConnection: async (id: number) => {
    return handleApiResponse<DbConnection>(
      apiClient.get(`/database/connections/${id}`),
      {
        errorMessage: `Failed to fetch database connection`,
        showSuccessToast: false
      }
    );
  },
  
  // Update a database connection
  updateConnection: async (id: number, data: Partial<DbConnectionRequest>) => {
    return handleApiResponse<DbConnection>(
      apiClient.put(`/database/connections/${id}`, data),
      {
        successMessage: 'Database connection updated successfully',
        errorMessage: 'Failed to update database connection',
        showSuccessToast: true
      }
    );
  },
  
  // Delete a database connection
  deleteConnection: async (id: number) => {
    return handleApiResponse<void>(
      apiClient.delete(`/database/connections/${id}`),
      {
        successMessage: 'Database connection deleted successfully',
        errorMessage: 'Failed to delete database connection',
        showSuccessToast: true
      }
    );
  },
  
  // Get database schema metadata
  getDatabaseMetadata: async (id: number) => {
    return handleApiResponse<DbMetadata>(
      apiClient.get(`/database/schema/metadata/${id}`),
      {
        errorMessage: 'Failed to fetch database metadata',
        showSuccessToast: false
      }
    );
  },
  
  // Refresh database schema metadata (force re-analysis)
  refreshDatabaseMetadata: async (id: number) => {
    return handleApiResponse<DbMetadata>(
      apiClient.post(`/database/schema/metadata/${id}/refresh`),
      {
        successMessage: 'Database schema refreshed successfully',
        errorMessage: 'Failed to refresh database schema',
        showSuccessToast: true
      }
    );
  },
  
  // Get database health status
  checkConnectionHealth: async (id: number) => {
    return handleApiResponse<any>(
      apiClient.get(`/database/health/connection/${id}`),
      {
        showSuccessToast: false,
        showErrorToast: false
      }
    );
  },
  
  // Get unified schema (enhanced schema with relationships, etc)
  getUnifiedSchema: async (id: number) => {
    return handleApiResponse<{ schema: DbSchema }>(
      apiClient.get(`/database/schema/unified/${id}`),
      {
        errorMessage: 'Failed to fetch database schema',
        showSuccessToast: false
      }
    );
  }
};