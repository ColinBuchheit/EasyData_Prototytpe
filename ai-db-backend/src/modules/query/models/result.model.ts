// src/modules/query/models/result.model.ts

export interface QueryResult {
  success: boolean;
  rows?: any[];
  rowCount?: number | null;
  executionTimeMs?: number | null;
  message?: string;
  error?: string;
  visualizationCode?: string;
}

  
  export interface MultiDbQueryResult {
    success: boolean;
    results?: Record<string, {
      dbName: string;
      dbType: string;
      data: any[];
      error?: string;
    }>;
    error?: string;
    message?: string;
  }
  
  export interface QueryHistoryRecord {
    id?: string;
    userId: number;
    dbId: number;
    queryText: string;
    executionTimeMs: number;
    rowCount: number;
    timestamp: Date;
  }