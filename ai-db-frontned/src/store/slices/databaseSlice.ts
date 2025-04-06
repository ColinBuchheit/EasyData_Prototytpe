// src/store/slices/databaseSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { databaseApi } from '../../api/database.api';
import { 
  DatabaseState, 
  DbConnectionRequest, 
  DbConnection,
  DbSchema,
  DbMetadata,
  ConnectionHealthStatus
} from '../../types/database.types';

const initialState: DatabaseState = {
  connections: [],
  selectedConnection: null,
  schema: null,
  metadata: null,
  healthStatus: {},
  loading: false,
  error: null,
};

// Async thunks
export const fetchUserConnections = createAsyncThunk(
  'database/fetchUserConnections',
  async (_, { rejectWithValue }) => {
    try {
      const response = await databaseApi.getUserConnections();
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to fetch database connections');
      }
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch database connections');
    }
  }
);

export const createConnection = createAsyncThunk(
  'database/createConnection',
  async (connectionData: DbConnectionRequest, { rejectWithValue }) => {
    try {
      const response = await databaseApi.createConnection(connectionData);
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to create database connection');
      }
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create database connection');
    }
  }
);

export const testConnection = createAsyncThunk(
  'database/testConnection',
  async (connectionData: DbConnectionRequest, { rejectWithValue }) => {
    try {
      const response = await databaseApi.testConnection(connectionData);
      if (!response.success) {
        return rejectWithValue(response.message || 'Connection test failed');
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Connection test failed');
    }
  }
);

export const fetchDatabaseMetadata = createAsyncThunk(
  'database/fetchDatabaseMetadata',
  async (dbId: number, { rejectWithValue }) => {
    try {
      const response = await databaseApi.getDatabaseMetadata(dbId);
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to fetch database metadata');
      }
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch database metadata');
    }
  }
);

export const fetchUnifiedSchema = createAsyncThunk(
  'database/fetchUnifiedSchema',
  async (dbId: number, { rejectWithValue }) => {
    try {
      const response = await databaseApi.getUnifiedSchema(dbId);
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to fetch unified schema');
      }
      return response.schema;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch unified schema');
    }
  }
);

export const checkConnectionHealth = createAsyncThunk(
  'database/checkConnectionHealth',
  async (dbId: number, { rejectWithValue }) => {
    try {
      const response = await databaseApi.checkConnectionHealth(dbId);
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to check connection health');
      }
      return response.status;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to check connection health');
    }
  }
);

export const deleteConnection = createAsyncThunk(
  'database/deleteConnection',
  async (dbId: number, { rejectWithValue }) => {
    try {
      const response = await databaseApi.deleteConnection(dbId);
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to delete connection');
      }
      return dbId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete connection');
    }
  }
);

// Database slice
const databaseSlice = createSlice({
  name: 'database',
  initialState,
  reducers: {
    setSelectedConnection: (state, action: PayloadAction<DbConnection | null>) => {
      state.selectedConnection = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch user connections
    builder.addCase(fetchUserConnections.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUserConnections.fulfilled, (state, action) => {
      state.loading = false;
      state.connections = action.payload;
    });
    builder.addCase(fetchUserConnections.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to fetch connections';
    });

    // Create connection
    builder.addCase(createConnection.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createConnection.fulfilled, (state, action) => {
      state.loading = false;
      state.connections.push(action.payload);
    });
    builder.addCase(createConnection.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to create connection';
    });

    // Fetch database metadata
    builder.addCase(fetchDatabaseMetadata.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchDatabaseMetadata.fulfilled, (state, action) => {
      state.loading = false;
      state.metadata = action.payload;
    });
    builder.addCase(fetchDatabaseMetadata.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to fetch metadata';
    });

    // Fetch unified schema
    builder.addCase(fetchUnifiedSchema.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUnifiedSchema.fulfilled, (state, action) => {
      state.loading = false;
      state.schema = action.payload;
    });
    builder.addCase(fetchUnifiedSchema.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to fetch schema';
    });

    // Check connection health
    builder.addCase(checkConnectionHealth.fulfilled, (state, action) => {
      const status = action.payload as ConnectionHealthStatus;
      state.healthStatus[status.id] = status;
    });

    // Delete connection
    builder.addCase(deleteConnection.fulfilled, (state, action) => {
      state.connections = state.connections.filter(conn => conn.id !== action.payload);
      if (state.selectedConnection?.id === action.payload) {
        state.selectedConnection = null;
      }
    });
  },
});

export const { setSelectedConnection, clearError } = databaseSlice.actions;
export default databaseSlice.reducer;