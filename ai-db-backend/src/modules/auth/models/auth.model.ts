// src/modules/auth/models/auth.model.ts
export interface TokenPayload {
    userId: number;
    role: string;
    exp?: number;
    iat?: number;
  }
  
  export interface AuthResponse {
    success: boolean;
    message?: string;
    token?: string;
    user?: {
      id: number;
      username: string;
      role: string;
    };
    tokenExpired?: boolean;
  }
  
  export interface PasswordResetToken {
    userId: number;
    email: string;
    exp?: number;
  }
  
  export interface AuthRequest {
    userId: number;
    role: string;
  }