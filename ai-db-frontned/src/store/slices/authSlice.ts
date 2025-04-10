// src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../api/auth.api';
import { 
  AuthState, 
  LoginRequest, 
  RegisterRequest,
  PasswordResetRequest
} from '../../types/auth.types';
import { setToken, clearTokens, getToken, getRefreshToken, setRefreshToken } from '../../utils/auth.utils';
import { fetchUserProfile } from './userSlice';
import { safeLogout } from '../../utils/auth-verification';

const initialState: AuthState = {
  user: null,
  token: getToken(),
  refreshToken: getRefreshToken(),
  isAuthenticated: !!getToken(),
  loading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { dispatch }) => {
    const response = await authApi.login(credentials);
    if (response.success) {
      // Set tokens
      setToken(response.token!);
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken);
      }
      
      // Fetch user profile after successful login
      dispatch(fetchUserProfile());
      
      return response;
    }
    throw new Error(response.message || 'Login failed');
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.register(userData);
      if (!response.success) {
        return rejectWithValue(response.message || 'Registration failed');
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Use our improved safe logout
      safeLogout();
      return { success: true };
    } catch (error: any) {
      // Even if API call fails, we should still clear local tokens
      clearTokens();
      return rejectWithValue(error.response?.data?.message || error.message || 'Logout failed');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (data: PasswordResetRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.resetPassword(data);
      if (!response.success) {
        return rejectWithValue(response.message || 'Password reset failed');
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Password reset failed');
    }
  }
);

export const getUserProfile = createAsyncThunk(
  'auth/getUserProfile',
  async (_, { dispatch }) => {
    // Reuse the fetchUserProfile action from userSlice
    dispatch(fetchUserProfile());
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set authenticated user manually (e.g., when app loads)
    setUser: (state, action: PayloadAction<AuthState['user']>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    // Clear error state
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user || null;
      state.token = action.payload.token || null;
      state.refreshToken = action.payload.refreshToken || null;
      state.isAuthenticated = !!action.payload.token;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Login failed';
    });

    // Register
    builder.addCase(register.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state) => {
      state.loading = false;
      // Don't set user/token - user should login after registration
    });
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Registration failed';
    });

    // Logout
    builder.addCase(logout.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(logout.fulfilled, (state) => {
      // Reset all state
      state.loading = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    });
    builder.addCase(logout.rejected, (state) => {
      // Reset all state regardless of API error
      state.loading = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    });
  },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer;