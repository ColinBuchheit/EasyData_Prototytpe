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

export const activateConnection = createAsyncThunk(
  'database/activateConnection',
  async (connectionId: number, { dispatch, getState, rejectWithValue }) => {
    try {
      // First check the connection health
      const healthResponse = await dispatch(checkConnectionHealth(connectionId)).unwrap();
      
      if (!healthResponse.isHealthy) {
        return rejectWithValue('Connection health check failed');
      }
      
      // Get the connection from state
      const state = getState() as any;
      const connection = state.database.connections.find(
        (conn: DbConnection) => conn.id === connectionId
      );
      
      if (!connection) {
        return rejectWithValue('Connection not found');
      }
      
      // Update the connection with is_connected = true
      const updatedConnection = {
        ...connection,
        is_connected: true
      };
      
      return updatedConnection;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to activate connection');
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
    updateConnectionStatus: (state, action: PayloadAction<{id: number, isConnected: boolean}>) => {
      const { id, isConnected } = action.payload;
      const connection = state.connections.find(conn => conn.id === id);
      if (connection) {
        connection.is_connected = isConnected;
      }
      
      // Also update the selected connection if it's the same one
      if (state.selectedConnection && state.selectedConnection.id === id) {
        state.selectedConnection.is_connected = isConnected;
      }
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
      const status = action.payload;
      state.healthStatus[status.id] = status;
      
      // Also update the is_connected flag on the actual connection object
      const connection = state.connections.find(conn => conn.id === status.id);
      if (connection) {
        connection.is_connected = status.isHealthy;
      }
      
      // Also update the selected connection if it's the same one
      if (state.selectedConnection && state.selectedConnection.id === status.id) {
        state.selectedConnection.is_connected = status.isHealthy;
      }
    });
    
    // Add a case for the new activateConnection thunk
    builder.addCase(activateConnection.fulfilled, (state, action) => {
      const updatedConnection = action.payload;
      
      // Update the connection in the connections array
      const connectionIndex = state.connections.findIndex(conn => conn.id === updatedConnection.id);
      if (connectionIndex >= 0) {
        state.connections[connectionIndex] = updatedConnection;
      }
      
      // Update the selected connection if it's the same one
      if (state.selectedConnection && state.selectedConnection.id === updatedConnection.id) {
        state.selectedConnection = updatedConnection;
      }
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

export const { setSelectedConnection, clearError, updateConnectionStatus } = databaseSlice.actions;
export default databaseSlice.reducer;