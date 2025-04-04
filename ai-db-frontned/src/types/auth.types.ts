// src/types/auth.types.ts
export interface User {
    id: number;
    username: string;
    email: string;
    role: UserRole;
  }
  
  export type UserRole = 'admin' | 'user' | 'read-only';
  
  export interface LoginRequest {
    username: string;
    password: string;
  }
  
  export interface LoginResponse {
    success: boolean;
    message?: string;
    token?: string;
    refreshToken?: string;
    user?: User;
    tokenExpired?: boolean;
  }
  
  export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
  }
  
  export interface RegisterResponse {
    success: boolean;
    message?: string;
    user?: User;
  }
  
  export interface PasswordResetRequest {
    token: string;
    newPassword: string;
  }
  
  export interface TokenValidationRequest {
    token: string;
  }
  
  export interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
  }