// src/modules/user/models/user.model.ts

export interface User {
    id: number;
    username: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    createdAt: Date;
    updatedAt?: Date;
    lastLoginAt?: Date;
  }
  
  export interface UserCreationData {
    username: string;
    email: string;
    password: string;
    role?: UserRole;
  }
  
  export interface UserUpdateData {
    username?: string;
    email?: string;
    role?: UserRole;
    status?: UserStatus;
  }
  
  export interface UserWithAuth extends User {
    password_hash: string;
  }
  
  export interface UserListOptions {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    status?: UserStatus;
    role?: UserRole;
    search?: string;
  }
  
  export type UserRole = 'admin' | 'user' | 'read-only';
  export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';