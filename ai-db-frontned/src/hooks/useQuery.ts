// src/hooks/useQuery.ts
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { 
  executeQuery, 
  executeNaturalLanguageQuery,
  getCurrentContext,
  setCurrentContext,
  fetchQueryHistory,
  updateQueryStatus
} from '../store/slices/querySlice';
import { QueryRequest, NaturalLanguageQueryRequest, QueryStatus } from '../types/query.types';
import { addMessage } from '../store/slices/chatSlice';
import { addToast } from '../store/slices/uiSlice';

export const useQuery = () => {
  const dispatch = useAppDispatch();
  const { 
    history, 
    currentContext, 
    status, 
    statusMessage, 
    lastError, 
    loading 
  } = useAppSelector(state => state.query);

  const runQuery = useCallback(async (query: QueryRequest) => {
    try {
      dispatch(updateQueryStatus({ status: QueryStatus.PROCESSING }));
      const result = await dispatch(executeQuery(query)).unwrap();
      
      // Add result to chat if needed
      dispatch(addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Query executed successfully',
        timestamp: new Date().toISOString(),
        queryResult: result
      }));
      
      return result;
    } catch (error) {
      dispatch(addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${error}`,
        timestamp: new Date().toISOString(),
        error: error as string
      }));
      
      dispatch(addToast({
        type: 'error',
        message: `Query execution failed: ${error}`
      }));
      
      return null;
    }
  }, [dispatch]);

  const runNaturalLanguageQuery = useCallback(async (request: NaturalLanguageQueryRequest) => {
    try {
      // Add user message to chat
      dispatch(addMessage({
        id: Date.now().toString(),
        role: 'user',
        content: request.task,
        timestamp: new Date().toISOString()
      }));
      
      dispatch(updateQueryStatus({ 
        status: QueryStatus.PROCESSING, 
        message: 'Processing your query...' 
      }));
      
      const result = await dispatch(executeNaturalLanguageQuery(request)).unwrap();
      
      // Add result to chat
      dispatch(addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: result.explanation || 'Query executed successfully',
        timestamp: new Date().toISOString(),
        queryResult: result
      }));
      
      return result;
    } catch (error) {
      dispatch(addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${error}`,
        timestamp: new Date().toISOString(),
        error: error as string
      }));
      
      dispatch(addToast({
        type: 'error',
        message: `Natural language query failed: ${error}`
      }));
      
      return null;
    }
  }, [dispatch]);

  const loadQueryHistory = useCallback(async (limit?: number, dbId?: number) => {
    try {
      return await dispatch(fetchQueryHistory({ limit, dbId })).unwrap();
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: `Failed to load query history: ${error}`
      }));
      return [];
    }
  }, [dispatch]);

  const loadCurrentContext = useCallback(async () => {
    try {
      return await dispatch(getCurrentContext()).unwrap();
    } catch (error) {
      return null;
    }
  }, [dispatch]);

  const setDbContext = useCallback(async (dbId: number) => {
    try {
      await dispatch(setCurrentContext(dbId)).unwrap();
      return true;
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: `Failed to set database context: ${error}`
      }));
      return false;
    }
  }, [dispatch]);

  return {
    history,
    currentContext,
    status,
    statusMessage,
    lastError,
    loading,
    runQuery,
    runNaturalLanguageQuery,
    loadQueryHistory,
    loadCurrentContext,
    setDbContext
  };
};

export default useQuery;