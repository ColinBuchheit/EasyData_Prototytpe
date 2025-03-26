// src/shared/utils/errorHandler.ts

import { Request, Response, NextFunction } from "express";
import { createContextLogger } from "../../config/logger";
import { createErrorResponse } from "../models/response.model";

const errorLogger = createContextLogger("ErrorHandler");

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;
  
  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR", details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
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

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ApiError) {
    // Log based on severity
    if (err.statusCode >= 500) {
      errorLogger.error(`Server error: ${err.message}`, { 
        path: req.path,
        method: req.method,
        code: err.code,
        details: err.details
      });
    } else {
      errorLogger.warn(`Client error: ${err.message}`, { 
        path: req.path,
        method: req.method,
        code: err.code
      });
    }
    
    // Send response
    res.status(err.statusCode).json(createErrorResponse(
      err.message,
      err.statusCode,
      err.code,
      err.details
    ));
  } else {
    // Unexpected error
    errorLogger.error(`Unexpected error: ${err.message}`, {
      error: err.stack,
      path: req.path,
      method: req.method
    });
    
    res.status(500).json(createErrorResponse(
      "An unexpected error occurred",
      500,
      "INTERNAL_SERVER_ERROR"
    ));
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
};