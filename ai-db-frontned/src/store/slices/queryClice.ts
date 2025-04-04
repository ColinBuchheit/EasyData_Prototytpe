// src/store/slices/querySlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { queryApi } from '../../api/query.api';
import { 
  QueryState, 
  QueryRequest, 
  NaturalLanguageQueryRequest,
  QueryStatus,
  QueryContext,
  QueryHistory
} from '../../types/query.types';

const initialState: QueryState = {
  history: [],
  currentContext: null,
  status: QueryStatus.IDLE,
  lastError: null,
  loading: false,
};

// Async thunks
export const executeQuery = createAsyncThunk(
  'query/executeQuery',
  async (query: QueryRequest, { rejectWithValue, dispatch }) => {
    try {
      // Update status to processing
      dispatch(updateQueryStatus({ status: QueryStatus.PROCESSING }));
      
      const response = await queryApi.executeQuery(query);
      if (!response.success) {
        return rejectWithValue(response.error || 'Query execution failed');
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Query execution failed');
    }
  }
);

export const executeNaturalLanguageQuery = createAsyncThunk(
  'query/executeNaturalLanguageQuery',
  async (request: NaturalLanguageQueryRequest, { rejectWithValue, dispatch }) => {
    try {
      // Update status to processing
      dispatch(updateQueryStatus({ status: QueryStatus.PROCESSING, message: 'Processing your query...' }));
      
      const response = await queryApi.processNaturalLanguageQuery(request);
      if (!response.success) {
        return rejectWithValue(response.error || 'Query execution failed');
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Query execution failed');
    }
  }
);

export const fetchQueryHistory = createAsyncThunk(
  'query/fetchQueryHistory',
  async (params: { limit?: number; dbId?: number } = {}, { rejectWithValue }) => {
    try {
      const limit = params.limit || 10;
      const response = await queryApi.getQueryHistory(limit, params.dbId);
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to fetch query history');
      }
      return response.history;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch query history');
    }
  }
);

export const getCurrentContext = createAsyncThunk(
  'query/getCurrentContext',
  async (_, { rejectWithValue }) => {
    try {
      const response = await queryApi.getCurrentContext();
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to get current context');
      }
      return response.context;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to get current context');
    }
  }
);

export const setCurrentContext = createAsyncThunk(
  'query/setCurrentContext',
  async (dbId: number, { rejectWithValue }) => {
    try {
      const response = await queryApi.setCurrentContext(dbId);
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to set current context');
      }
      return { dbId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to set current context');
    }
  }
);

// Query slice
const querySlice = createSlice({
  name: 'query',
  initialState,
  reducers: {
    updateQueryStatus: (state, action: PayloadAction<{ 
      status: QueryStatus; 
      message?: string 
    }>) => {
      state.status = action.payload.status;
      state.statusMessage = action.payload.message;
      
      if (action.payload.status === QueryStatus.FAILED) {
        state.lastError = action.payload.message || 'Query execution failed';
      }
    },
    clearError: (state) => {
      state.lastError = null;
    },
  },
  extraReducers: (builder) => {
    // Execute query
    builder.addCase(executeQuery.pending, (state) => {
      state.loading = true;
      state.lastError = null;
    });
    builder.addCase(executeQuery.fulfilled, (state) => {
      state.loading = false;
      state.status = QueryStatus.COMPLETED;
    });
    builder.addCase(executeQuery.rejected, (state, action) => {
      state.loading = false;
      state.lastError = action.payload as string || 'Query execution failed';
      state.status = QueryStatus.FAILED;
    });

    // Execute natural language query
    builder.addCase(executeNaturalLanguageQuery.pending, (state) => {
      state.loading = true;
      state.lastError = null;
    });
    builder.addCase(executeNaturalLanguageQuery.fulfilled, (state) => {
      state.loading = false;
      state.status = QueryStatus.COMPLETED;
    });
    builder.addCase(executeNaturalLanguageQuery.rejected, (state, action) => {
      state.loading = false;
      state.lastError = action.payload as string || 'Natural language query execution failed';
      state.status = QueryStatus.FAILED;
    });

    // Fetch query history
    builder.addCase(fetchQueryHistory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchQueryHistory.fulfilled, (state, action) => {
      state.loading = false;
      state.history = action.payload;
    });
    builder.addCase(fetchQueryHistory.rejected, (state, action) => {
      state.loading = false;
      state.lastError = action.payload as string || 'Failed to fetch query history';
    });

    // Get current context
    builder.addCase(getCurrentContext.fulfilled, (state, action) => {
      state.currentContext = action.payload;
    });

    // Set current context
    builder.addCase(setCurrentContext.fulfilled, (state, action) => {
      if (state.currentContext) {
        state.currentContext.currentDbId = action.payload.dbId;
        state.currentContext.lastSwitchTime = new Date().toISOString();
      }
    });
  },
});

export const { updateQueryStatus, clearError } = querySlice.actions;
export default querySlice.reducer;