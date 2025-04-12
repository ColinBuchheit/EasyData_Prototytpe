// src/types/api.types.ts
export interface ApiError {
    code?: string;
    message: string;
    details?: any;
  }
  
  export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  }
  
  export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: PaginationMeta;
  }
  
  export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    statusCode?: number;
  }