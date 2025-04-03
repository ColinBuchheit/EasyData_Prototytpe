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
  // Added fields for pagination and metadata
  totalRecords?: number;
  pageSize?: number;
  pageNumber?: number;
  totalPages?: number;
  executionTimeMs?: number;
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
  // Added timestamp for report generation
  generatedAt: Date;
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
  // Added timestamp for report generation
  generatedAt: Date;
}

export interface SecurityReport {
  totalEvents: number;
  eventsByType: { type: string; count: number }[];
  eventsBySeverity: { severity: string; count: number }[];
  topSources: { sourceIp: string; count: number }[];
  unresolvedEvents: number;
  // Added timestamp for report generation
  generatedAt: Date;
}

export type ReportType = 
  | 'usage'
  | 'performance'
  | 'security'
  | 'custom';

/**
 * Class implementation of UsageReport with validation
 */
export class UsageReportImpl implements UsageReport {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  totalQueries: number;
  queriesPerUser: { userId: number; queryCount: number }[];
  mostUsedDatabases: { dbId: number; name: string; count: number }[];
  queryTypes: { type: string; count: number }[];
  generatedAt: Date;
  
  constructor(data: Partial<UsageReport> = {}) {
    this.activeUsers = data.activeUsers || { daily: 0, weekly: 0, monthly: 0 };
    this.totalQueries = data.totalQueries || 0;
    this.queriesPerUser = data.queriesPerUser || [];
    this.mostUsedDatabases = data.mostUsedDatabases || [];
    this.queryTypes = data.queryTypes || [];
    this.generatedAt = data.generatedAt || new Date();
  }
  
  validate(): boolean {
    // Simple validation rules
    if (this.totalQueries < 0) return false;
    if (this.activeUsers.daily < 0 || this.activeUsers.weekly < 0 || this.activeUsers.monthly < 0) return false;
    return true;
  }
  
  toJSON(): UsageReport {
    return {
      activeUsers: this.activeUsers,
      totalQueries: this.totalQueries,
      queriesPerUser: this.queriesPerUser,
      mostUsedDatabases: this.mostUsedDatabases,
      queryTypes: this.queryTypes,
      generatedAt: this.generatedAt
    };
  }
}

/**
 * Factory method to create a report instance
 */
export function createReport(type: ReportType, data: any, userId?: number): Report {
  const report: Report = {
    name: `${type.charAt(0).toUpperCase()}${type.slice(1)} Report`,
    type,
    data,
    generatedAt: new Date(),
    userId
  };
  
  return report;
}