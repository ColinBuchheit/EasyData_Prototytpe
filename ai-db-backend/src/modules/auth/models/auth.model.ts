// src/modules/auth/models/auth.model.ts
export interface TokenPayload {
  userId: number;
  role: string;
  type?: string;
  exp?: number;
  iat?: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  refreshToken?: string; // Added refreshToken to the interface
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