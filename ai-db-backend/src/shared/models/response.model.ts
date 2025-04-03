// src/shared/models/response.model.ts

/**
 * Standard API success response
 */
export interface SuccessResponse<T = any> {
    success: true;
    data: T;
    message?: string;
  }
  
  /**
   * Standard API error response
   */
  export interface ErrorResponse {
    success: false;
    message: string;
    error?: string;
    statusCode?: number;
    details?: any;
  }
  
  /**
   * Generic API response type
   */
  export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;
  
  /**
   * Pagination metadata
   */
  export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  }
  
  /**
   * Paginated response
   */
  export interface PaginatedResponse<T> {
    success: true;
    data: T[];
    pagination: PaginationMeta;
  }
  
  /**
   * Helper to create a success response
   */
  export function createSuccessResponse<T>(data: T, message?: string): SuccessResponse<T> {
    return {
      success: true,
      data,
      message
    };
  }
  
  /**
   * Helper to create an error response
   */
  export function createErrorResponse(
    message: string, 
    statusCode = 500, 
    error?: string, 
    details?: any
  ): ErrorResponse {
    return {
      success: false,
      message,
      error,
      statusCode,
      details
    };
  }
  
  /**
   * Helper to create a paginated response
   */
  export function createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResponse<T> {
    const pages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages,
        hasMore: page < pages
      }
    };
  }