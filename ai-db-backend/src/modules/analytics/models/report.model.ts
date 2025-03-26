// src/modules/analytics/models/report.model.ts

export interface Report {
    id?: string;
    name: string;
    type: ReportType;
    filters?: ReportFilter[];
    data: any;
    generatedAt: Date;
    userId?: number;
    format?: 'json' | 'csv' | 'pdf';
  }
  
  export interface ReportFilter {
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in';
    value: any;
  }
  
  export interface UsageReport {
    activeUsers: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    totalQueries: number;
    queriesPerUser: { userId: number; queryCount: number }[];
    mostUsedDatabases: { dbId: number; name: string; count: number }[];
    queryTypes: { type: string; count: number }[];
  }
  
  export interface PerformanceReport {
    averageQueryTime: number;
    slowestQueries: {
      query: string;
      executionTimeMs: number;
      userId: number;
      dbId: number;
      timestamp: Date;
    }[];
    databasePerformance: {
      dbId: number;
      name: string;
      avgExecutionTimeMs: number;
      queryCount: number;
    }[];
    aiResponseTimes: {
      average: number;
      p95: number;
      p99: number;
    };
  }
  
  export interface SecurityReport {
    totalEvents: number;
    eventsByType: { type: string; count: number }[];
    eventsBySeverity: { severity: string; count: number }[];
    topSources: { sourceIp: string; count: number }[];
    unresolvedEvents: number;
  }
  
  export type ReportType = 
    | 'usage'
    | 'performance'
    | 'security'
    | 'custom';