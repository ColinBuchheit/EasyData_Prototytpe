// src/modules/analytics/models/metric.model.ts

/**
 * Base Metric Interface
 */
export interface Metric {
  id?: string;
  name: string;
  value: number;
  dimension?: string;
  timestamp: Date;
  userId?: number;
  dbId?: number;
}

/**
 * Performance metric for tracking execution time and query stats
 */
export interface PerformanceMetric {
  executionTimeMs: number;
  timestamp: Date;
  dbId?: number;
  userId: number;
  queryType?: string;
  rowCount?: number;
  success: boolean;
  
  // Method to validate the metric
  validate?(): boolean;
}

/**
 * Usage metric for tracking user actions
 */
export interface UsageMetric {
  userId: number;
  action: UserAction;
  resourceId?: number;
  resourceType?: string;
  timestamp: Date;
  details?: Record<string, any>;
  
  // Method to validate the metric
  validate?(): boolean;
}

/**
 * Security metric for tracking security events
 */
export interface SecurityMetric {
  userId?: number;
  eventType: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  sourceIp?: string;
  resolved: boolean;
  details?: Record<string, any>;
  
  // Method to check if this is a critical event
  isCritical?(): boolean;
  // Method to validate the metric
  validate?(): boolean;
}

/**
 * Error metric for tracking application errors
 */
export interface ErrorMetric {
  userId?: number;
  errorType: string;
  message: string;
  stack?: string;
  timestamp: Date;
  route?: string;
  method?: string;
  resourceId?: number;
  resourceType?: string;
  
  // Method to validate the metric
  validate?(): boolean;
}

/**
 * User actions that can be tracked
 */
export type UserAction = 
  | 'login'
  | 'logout'
  | 'register'
  | 'password_change'
  | 'create_connection'
  | 'update_connection'
  | 'delete_connection'
  | 'execute_query'
  | 'ai_query'
  | 'multi_db_query'
  | 'view_dashboard'
  | 'export_data';

/**
 * Security event types that can be tracked
 */
export type SecurityEventType = 
  | 'failed_login'
  | 'suspicious_query'
  | 'unauthorized_access'
  | 'rate_limit_exceeded'
  | 'token_reuse'
  | 'password_guessing'
  | 'sql_injection_attempt'
  | 'parameter_tampering';

/**
 * Class implementation of PerformanceMetric with validation
 */
export class PerformanceMetricImpl implements PerformanceMetric {
  executionTimeMs: number;
  timestamp: Date;
  dbId?: number;
  userId: number;
  queryType?: string;
  rowCount?: number;
  success: boolean;
  
  constructor(data: PerformanceMetric) {
    this.executionTimeMs = data.executionTimeMs;
    this.timestamp = data.timestamp || new Date();
    this.dbId = data.dbId;
    this.userId = data.userId;
    this.queryType = data.queryType;
    this.rowCount = data.rowCount;
    this.success = data.success;
  }
  
  validate(): boolean {
    if (this.executionTimeMs < 0) return false;
    if (!this.userId) return false;
    if (this.timestamp > new Date()) return false; // No future timestamps
    return true;
  }
  
  toJSON(): PerformanceMetric {
    return {
      executionTimeMs: this.executionTimeMs,
      timestamp: this.timestamp,
      dbId: this.dbId,
      userId: this.userId,
      queryType: this.queryType,
      rowCount: this.rowCount,
      success: this.success
    };
  }
}

/**
 * Class implementation of SecurityMetric with validation and additional methods
 */
export class SecurityMetricImpl implements SecurityMetric {
  userId?: number;
  eventType: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  sourceIp?: string;
  resolved: boolean;
  details?: Record<string, any>;
  
  constructor(data: SecurityMetric) {
    this.userId = data.userId;
    this.eventType = data.eventType;
    this.severity = data.severity;
    this.description = data.description;
    this.timestamp = data.timestamp || new Date();
    this.sourceIp = data.sourceIp;
    this.resolved = data.resolved || false;
    this.details = data.details;
  }
  
  validate(): boolean {
    if (!this.eventType) return false;
    if (!this.severity) return false;
    if (!this.description) return false;
    if (this.timestamp > new Date()) return false; // No future timestamps
    return true;
  }
  
  isCritical(): boolean {
    return this.severity === 'critical' || this.severity === 'high';
  }
  
  toJSON(): SecurityMetric {
    return {
      userId: this.userId,
      eventType: this.eventType,
      severity: this.severity,
      description: this.description,
      timestamp: this.timestamp,
      sourceIp: this.sourceIp,
      resolved: this.resolved,
      details: this.details
    };
  }
}