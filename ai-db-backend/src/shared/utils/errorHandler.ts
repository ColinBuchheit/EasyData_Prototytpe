// src/shared/utils/errorHandler.ts

import { Request, Response, NextFunction 
  /**
   * Global error handler middleware
   */
  export const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    // Generate a request ID for tracking
    const requestId = uuidv4();
    
    if (err instanceof ApiError) {
      // Log based on severity
      if (err.statusCode >= 500) {
        errorLogger.error(`Server error: ${err.message}`, { 
          path: req.path,
          method: req.method,
          code: err.code,
          requestId,
          details: err.details
        });
      } else {
        errorLogger.warn(`Client error: ${err.message}`, { 
          path: req.path,
          method: req.method,
          code: err.code,
          requestId
        });
      }
      
      // Update request ID in standardized error
      err.standardError.requestId = requestId;
      
      // Send response
      res.status(err.statusCode).json({
        success: false,
        error: err.standardError
      });
    } else if (err instanceof Error && 'standardError' in err && (err as any).standardError) {
      // Handle errors that already have a standardError property (like from AI agent)
      const standardError = (err as any).standardError as StandardError;
      standardError.requestId = requestId;
      
      // Determine status code based on error type
      let statusCode = 500;
      if (standardError.type.startsWith('validation_')) statusCode = 400;
      if (standardError.type.startsWith('auth_')) statusCode = 401;
      
      errorLogger.error(`Standardized error: ${err.message}`, {
        path: req.path,
        method: req.method,
        requestId,
        errorType: standardError.type
      });
      
      res.status(statusCode).json({
        success: false,
        error: standardError
      });
    } else {
      // Unexpected error - create a standardized system error
      const systemError = createSystemError(
        err.message || "An unexpected error occurred",
        "api_server",
        ErrorSeverity.HIGH,
        {
          stack: err.stack,
          path: req.path,
          method: req.method
        }
      );
      
      // Add request ID
      systemError.requestId = requestId;
      
      // Log error
      errorLogger.error(`Unexpected error: ${err.message || "Unknown error"}`, {
        error: err.stack,
        path: req.path,
        method: req.method,
        requestId
      });
      
      res.status(500).json({
        success: false,
        error: systemError
      });
    }
  };
  
  /**
   * Async handler to wrap controller functions
   */
  export const asyncHandler = (fn: Function) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }; from "express";
  import { createContextLogger } from "../../config/logger";
  import { createErrorResponse } from "../models/response.model";
  import { StandardError, ErrorSeverity, ErrorType, createSystemError } from "../models/error.model";
  import { v4 as uuidv4 } from "uuid";
  
  const errorLogger = createContextLogger("ErrorHandler");
  
  /**
   * Custom API Error class with standardized error format
   */
  export class ApiError extends Error {
    statusCode: number;
    code: string;
    details?: any;
    standardError: StandardError;
    
    constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR", details?: any) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.details = details;
      
      // Automatically create standardized error
      this.standardError = {
        code: code,
        type: this.mapCodeToType(code),
        message: message,
        details: details,
        severity: this.mapStatusCodeToSeverity(statusCode),
        timestamp: new Date().toISOString(),
        source: "backend",
        requestId: uuidv4(),
      };
      
      Object.setPrototypeOf(this, ApiError.prototype);
    }
    
    private mapStatusCodeToSeverity(statusCode: number): ErrorSeverity {
      if (statusCode >= 500) return ErrorSeverity.HIGH;
      if (statusCode >= 400) return ErrorSeverity.MEDIUM;
      return ErrorSeverity.LOW;
    }
    
    private mapCodeToType(code: string): ErrorType {
      switch(code) {
        case "BAD_REQUEST": return ErrorType.VALIDATION_INVALID_FORMAT;
        case "UNAUTHORIZED": return ErrorType.AUTH_INVALID_CREDENTIALS;
        case "FORBIDDEN": return ErrorType.AUTH_INSUFFICIENT_PERMISSIONS;
        case "NOT_FOUND": return ErrorType.USER_NOT_FOUND;
        case "CONFLICT": return ErrorType.VALIDATION_BUSINESS_RULE;
        case "VALIDATION_ERROR": return ErrorType.VALIDATION_INVALID_FORMAT;
        case "SERVER_ERROR": return ErrorType.SYSTEM_UNEXPECTED;
        case "DATABASE_ERROR": return ErrorType.DATABASE_QUERY;
        default: return ErrorType.SYSTEM_UNEXPECTED;
      }
    }
    
    static badRequest(message: string, code = "BAD_REQUEST", details?: any) {
      return new ApiError(message, 400, code, details);
    }
    
    static unauthorized(message: string, code = "UNAUTHORIZED", details?: any) {
      return new ApiError(message, 401, code, details);
    }
    
    static forbidden(message: string, code = "FORBIDDEN", details?: any) {
      return new ApiError(message, 403, code, details);
    }
    
    static notFound(message: string, code = "NOT_FOUND", details?: any) {
      return new ApiError(message, 404, code, details);
    }
    
    static conflict(message: string, code = "CONFLICT", details?: any) {
      return new ApiError(message, 409, code, details);
    }
    
    static validationError(message: string, details?: any) {
      return new ApiError(message, 422, "VALIDATION_ERROR", details);
    }
    
    static serverError(message: string, code = "SERVER_ERROR", details?: any) {
      return new ApiError(message, 500, code, details);
    }
  }