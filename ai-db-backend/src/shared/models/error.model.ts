// src/shared/models/error.model.ts

export enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
  }
  
  export enum ErrorType {
    // Database errors
    DATABASE_CONNECTION = "database_connection",
    DATABASE_QUERY = "database_query",
    DATABASE_SCHEMA = "database_schema",
    DATABASE_AUTH = "database_auth",
    
    // AI service errors
    AI_SERVICE_UNAVAILABLE = "ai_service_unavailable",
    AI_PROCESSING = "ai_processing",
    AI_TIMEOUT = "ai_timeout",
    AI_RATE_LIMIT = "ai_rate_limit",
    
    // Auth errors
    AUTH_INVALID_CREDENTIALS = "auth_invalid_credentials",
    AUTH_EXPIRED_TOKEN = "auth_expired_token",
    AUTH_INSUFFICIENT_PERMISSIONS = "auth_insufficient_permissions",
    
    // Input validation errors
    VALIDATION_REQUIRED_FIELD = "validation_required_field",
    VALIDATION_INVALID_FORMAT = "validation_invalid_format",
    VALIDATION_BUSINESS_RULE = "validation_business_rule",
    
    // System errors
    SYSTEM_UNEXPECTED = "system_unexpected",
    SYSTEM_DEPENDENCY = "system_dependency",
    
    // Security errors
    SECURITY_INJECTION = "security_injection",
    SECURITY_RATE_LIMIT = "security_rate_limit",
    
    // User errors
    USER_NOT_FOUND = "user_not_found",
    USER_INACTIVE = "user_inactive"
  }
  
  /**
   * Standard error interface for both backend and AI agent network
   */
  export interface StandardError {
    code: string;
    type: ErrorType;
    message: string;
    details?: any;
    severity: ErrorSeverity;
    timestamp: string;
    requestId?: string;
    source?: string;
    suggestions?: string[];
    operation?: string;
  }
  
  /**
   * Create a database error
   */
  export function createDatabaseError(
    message: string,
    dbType: string,
    operation: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    errorCode?: string,
    details?: any
  ): StandardError {
    return {
      code: errorCode || "DB_ERROR",
      type: ErrorType.DATABASE_QUERY,
      message,
      details: {
        dbType,
        operation,
        ...details
      },
      severity,
      timestamp: new Date().toISOString(),
      source: "backend",
      operation
    };
  }
  
  /**
   * Create an AI service error
   */
  export function createAIServiceError(
    message: string,
    service: string,
    model: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    errorCode?: string,
    details?: any
  ): StandardError {
    return {
      code: errorCode || "AI_SERVICE_ERROR",
      type: ErrorType.AI_PROCESSING,
      message,
      details: {
        service,
        model,
        ...details
      },
      severity,
      timestamp: new Date().toISOString(),
      source: "backend",
      operation: "ai_processing"
    };
  }
  
  /**
   * Create a validation error
   */
  export function createValidationError(
    message: string,
    validationType: string,
    severity: ErrorSeverity = ErrorSeverity.LOW,
    details?: any
  ): StandardError {
    return {
      code: "VALIDATION_ERROR",
      type: ErrorType.VALIDATION_INVALID_FORMAT,
      message,
      details: {
        validationType,
        ...details
      },
      severity,
      timestamp: new Date().toISOString(),
      source: "backend",
      operation: "input_validation"
    };
  }
  
  /**
   * Create a security error
   */
  export function createSecurityError(
    message: string,
    securityType: string,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    details?: any
  ): StandardError {
    return {
      code: "SECURITY_ERROR",
      type: ErrorType.SECURITY_INJECTION,
      message,
      details: {
        securityType,
        ...details
      },
      severity,
      timestamp: new Date().toISOString(),
      source: "backend",
      operation: "security_check"
    };
  }
  
  /**
   * Create a system error
   */
  export function createSystemError(
    message: string,
    systemComponent: string,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    details?: any
  ): StandardError {
    return {
      code: "SYSTEM_ERROR",
      type: ErrorType.SYSTEM_UNEXPECTED,
      message,
      details: {
        systemComponent,
        ...details
      },
      severity,
      timestamp: new Date().toISOString(),
      source: "backend",
      operation: "system_operation"
    };
  }