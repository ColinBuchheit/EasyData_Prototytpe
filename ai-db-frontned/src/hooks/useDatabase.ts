// src/hooks/useDatabase.ts
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { 
  fetchUserConnections, 
  createConnection, 
  fetchDatabaseMetadata, 
  fetchUnifiedSchema,
  setSelectedConnection,
  deleteConnection,
  checkConnectionHealth
} from '../store/slices/databaseSlice';
import { DbConnectionRequest } from '../types/database.types';
import { addToast } from '../store/slices/uiSlice';

export const useDatabase = () => {
  const dispatch = useAppDispatch();
  const { 
    connections, 
    selectedConnection, 
    schema, 
    metadata,
    healthStatus,
    loading, 
    error 
  } = useAppSelector(state => state.database);

  const loadUserConnections = useCallback(async () => {
    try {
      const result = await dispatch(fetchUserConnections()).unwrap();
      return result;
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: `Failed to load database connections: ${error}`
      }));
      return [];
    }
  }, [dispatch]);

  const addConnection = useCallback(async (connectionData: DbConnectionRequest) => {
    try {
      const result = await dispatch(createConnection(connectionData)).unwrap();
      dispatch(addToast({
        type: 'success',
        message: 'Database connection created successfully'
      }));
      return result;
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: `Failed to create connection: ${error}`
      }));
      return null;
    }
  }, [dispatch]);

  const loadMetadata = useCallback(async (dbId: number) => {
    try {
      return await dispatch(fetchDatabaseMetadata(dbId)).unwrap();
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: `Failed to load database metadata: ${error}`
      }));
      return null;
    }
  }, [dispatch]);

  const loadSchema = useCallback(async (dbId: number) => {
    try {
      return await dispatch(fetchUnifiedSchema(dbId)).unwrap();
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: `Failed to load database schema: ${error}`
      }));
      return null;
    }
  }, [dispatch]);

  const selectConnection = useCallback((connection: typeof selectedConnection) => {
    dispatch(setSelectedConnection(connection));
  }, [dispatch]);

  const removeConnection = useCallback(async (dbId: number) => {
    try {
      await dispatch(deleteConnection(dbId)).unwrap();
      dispatch(addToast({
        type: 'success',
        message: 'Database connection deleted successfully'
      }));
      return true;
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: `Failed to delete connection: ${error}`
      }));
      return false;
    }
  }, [dispatch]);

  const checkHealth = useCallback(async (dbId: number) => {
    try {
      return await dispatch(checkConnectionHealth(dbId)).unwrap();
    } catch (error) {
      // Don't show toast for health checks, as they happen in background
      return null;
    }
  }, [dispatch]);

  return {
    connections,
    selectedConnection,
    schema,
    metadata,
    healthStatus,
    loading,
    error,
    loadUserConnections,
    addConnection,
    loadMetadata,
    loadSchema,
    selectConnection,
    removeConnection,
    checkHealth
  };
};

export default useDatabase;