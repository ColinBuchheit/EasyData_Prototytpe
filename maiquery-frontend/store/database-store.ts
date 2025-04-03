// store/database-store.ts
import { create } from 'zustand';
import { Database } from '../lib/types/chat';
import apiClient from '../lib/api/cleint ';

interface DatabaseState {
  databases: Database[];
  currentDatabaseId: number | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchDatabases: () => Promise<void>;
  setCurrentDatabase: (id: number | null) => Promise<void>;
  testConnection: (config: any) => Promise<{ success: boolean; message: string }>;
  createConnection: (config: any) => Promise<Database>;
  updateConnection: (id: number, config: any) => Promise<Database>;
  deleteConnection: (id: number) => Promise<boolean>;
  
  // Selectors
  getCurrentDatabase: () => Database | null;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  databases: [],
  currentDatabaseId: null,
  isLoading: false,
  error: null,
  
  fetchDatabases: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.get('/database/connections');
      
      if (response.data.success) {
        set({ databases: response.data.data || [] });
        
        // Also try to get current context
        try {
          const contextResponse = await apiClient.get('/query/context');
          if (contextResponse.data.success && contextResponse.data.context) {
            set({ currentDatabaseId: contextResponse.data.context.currentDbId });
          }
        } catch (contextError) {
          console.error('Error fetching current context:', contextError);
        }
      } else {
        set({ error: response.data.message || 'Failed to fetch databases' });
      }
    } catch (error) {
      console.error('Failed to fetch databases:', error);
      set({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  setCurrentDatabase: async (id) => {
    set({ isLoading: true, error: null });
    
    try {
      if (id === null) {
        set({ currentDatabaseId: null });
        return;
      }
      
      const response = await apiClient.post('/query/context', { dbId: id });
      
      if (response.data.success) {
        set({ currentDatabaseId: id });
      } else {
        set({ error: response.data.message || 'Failed to set current database' });
      }
    } catch (error) {
      console.error('Failed to set current database:', error);
      set({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  testConnection: async (config) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.post('/database/connections/test', config);
      return {
        success: response.data.success,
        message: response.data.message || 'Connection successful',
      };
    } catch (error) {
      console.error('Failed to test connection:', error);
      return {
        success: false,
        message: error instanceof Error 
          ? error.message 
          : 'Failed to test connection',
      };
    } finally {
      set({ isLoading: false });
    }
  },
  
  createConnection: async (config) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.post('/database/connections', config);
      
      if (response.data.success) {
        const newDatabase = response.data.data;
        set((state) => ({ databases: [...state.databases, newDatabase] }));
        return newDatabase;
      } else {
        set({ error: response.data.message || 'Failed to create connection' });
        throw new Error(response.data.message || 'Failed to create connection');
      }
    } catch (error) {
      console.error('Failed to create connection:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateConnection: async (id, config) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.put(`/database/connections/${id}`, config);
      
      if (response.data.success) {
        const updatedDatabase = response.data.data;
        set((state) => ({
          databases: state.databases.map((db) => 
            db.id === id ? updatedDatabase : db
          ),
        }));
        return updatedDatabase;
      } else {
        set({ error: response.data.message || 'Failed to update connection' });
        throw new Error(response.data.message || 'Failed to update connection');
      }
    } catch (error) {
      console.error('Failed to update connection:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteConnection: async (id) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.delete(`/database/connections/${id}`);
      
      if (response.data.success) {
        set((state) => ({
          databases: state.databases.filter((db) => db.id !== id),
          // If current database is deleted, reset currentDatabaseId
          currentDatabaseId: state.currentDatabaseId === id ? null : state.currentDatabaseId,
        }));
        return true;
      } else {
        set({ error: response.data.message || 'Failed to delete connection' });
        return false;
      }
    } catch (error) {
      console.error('Failed to delete connection:', error);
      set({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  
  getCurrentDatabase: () => {
    const { databases, currentDatabaseId } = get();
    if (!currentDatabaseId) return null;
    return databases.find((db) => db.id === currentDatabaseId) || null;
  },
}));