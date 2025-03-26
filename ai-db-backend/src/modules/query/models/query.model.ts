// src/modules/query/models/query.model.ts

import { DatabaseType } from "../../database/models/database-types.model";

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
  options?: {
    visualize?: boolean;
    format?: string;
  };
}

export interface AIQueryResponse {
  success: boolean;
  query?: string;
  explanation?: string;
  error?: string;
  visualizationCode?: string;
}