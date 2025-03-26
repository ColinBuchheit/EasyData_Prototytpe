// src/modules/analytics/models/metric.model.ts

export interface Metric {
    id?: string;
    name: string;
    value: number;
    dimension?: string;
    timestamp: Date;
    userId?: number;
    dbId?: number;
  }
  
  export interface PerformanceMetric {
    executionTimeMs: number;
    timestamp: Date;
    dbId?: number;
    userId: number;
    queryType?: string;
    rowCount?: number;
    success: boolean;
  }
  
  export interface UsageMetric {
    userId: number;
    action: UserAction;
    resourceId?: number;
    resourceType?: string;
    timestamp: Date;
    details?: Record<string, any>;
  }
  
  export interface SecurityMetric {
    userId?: number;
    eventType: SecurityEventType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: Date;
    sourceIp?: string;
    resolved: boolean;
    details?: Record<string, any>;
  }
  
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
  }
  
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
  
  export type SecurityEventType = 
    | 'failed_login'
    | 'suspicious_query'
    | 'unauthorized_access'
    | 'rate_limit_exceeded'
    | 'token_reuse'
    | 'password_guessing'
    | 'sql_injection_attempt'
    | 'parameter_tampering';