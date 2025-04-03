// src/modules/query/models/query.model.ts

import { DatabaseType } from "../../database/models/database.types.model";

export interface Query {
  id?: number;
  userId: number;
  dbId: number;
  queryText: string;
  executionTimeMs?: number;
  rowCount?: number;
  status: QueryStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export type QueryStatus = "pending" | "executing" | "completed" | "failed";

export interface QueryRequest {
  dbId: number;
  query: string;
}

export interface NaturalLanguageQueryRequest {
  dbId?: number;
  task: string;
  visualize?: boolean;
  refresh?: boolean;
}

export interface QueryValidationResult {
  isValid: boolean;
  message?: string;
  query?: string;
}

export interface AIQueryRequest {
  userId: number;
  dbId: number;
  dbType: DatabaseType;
  dbName: string;
  task: string;
  schema?: any;
  options?: {
    visualize?: boolean;
    format?: string;
    refresh?: boolean;
  };
}

export interface AIQueryResponse {
  success: boolean;
  query?: string;
  results?: any[];
  explanation?: string;
  error?: string;
  visualizationCode?: string;
  agentsCalled?: string[];
  cached?: boolean;
}

// Schema for reporting analytical insights on query execution
export interface QueryAnalytics {
  userId: number;
  dbId: number;
  task: string;
  queryGenerated: boolean;
  executionTimeMs?: number;
  errorOccurred: boolean;
  errorType?: string;
  timestamp: Date;
  aiResponseTimeMs?: number;
}

// Enhanced schema for tracking query history with AI-related fields
export interface AIQueryHistoryRecord {
  id?: string;
  userId: number;
  dbId: number;
  task: string;
  queryText: string;
  explanation?: string;
  executionTimeMs: number;
  aiProcessingTimeMs?: number;
  visualizationGenerated: boolean;
  rowCount: number;
  timestamp: Date;
}

// Batch query execution interfaces
export interface BatchQueryRequest {
  queries: QueryRequest[];
  transactional?: boolean;
}

export interface BatchQueryResult {
  success: boolean;
  results?: any[];
  failedQueries?: {
    index: number;
    query: string;
    error: string;
  }[];
  message?: string;
}