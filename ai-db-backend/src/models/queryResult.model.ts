// src/models/queryResult.model.ts
export interface QueryResult {
    _id?: string;
    userId: number;
    dbId: number;
    query: string;
    result: any;
    executionTimeMs?: number | null;
    timestamp: Date;
  }