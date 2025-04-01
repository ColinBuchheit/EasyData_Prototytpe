// src/modules/database/services/clients/interfaces.ts

import { UserDatabase } from "../../models/connection.model";

export interface IDatabaseClient {
  /**
   * Connects to the target database
   */
  connect(db: UserDatabase): Promise<any>;

  /**
   * Returns a list of all tables or collections
   */
  fetchTables(db: UserDatabase): Promise<string[]>;

  /**
   * Returns the schema for a specific table or collection
   */
  fetchSchema(db: UserDatabase, table: string): Promise<any>;

  /**
   * Executes a user query on the target DB
   */
  runQuery(db: UserDatabase, query: any): Promise<any>;

  /**
   * Tests the database connection
   */
  testConnection(db: UserDatabase): Promise<boolean>;

  /**
   * Closes connections and performs cleanup
   */
  disconnect(db: UserDatabase): Promise<void>;

  /**
   * Performs a health check on the database connection
   */
  checkHealth?(db: UserDatabase): Promise<HealthCheckResult>;

  /**
   * Sanitizes input to prevent SQL injection and other attacks
   * This method must be implemented by all adapters
   */
  sanitizeInput(input: string): string;

  /**
   * Begins a database transaction
   */
  beginTransaction?(db: UserDatabase): Promise<any>;

  /**
   * Executes a query within an existing transaction
   */
  executeInTransaction?(transaction: any, query: string): Promise<any>;

  /**
   * Commits a database transaction
   */
  commitTransaction?(transaction: any): Promise<void>;

  /**
   * Rolls back a database transaction
   */
  rollbackTransaction?(transaction: any): Promise<void>;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  latencyMs: number;
  message: string;
  timestamp: Date;
}

export interface DatabaseError extends Error {
  code?: string;
  sqlState?: string;
  query?: string;
  parameters?: any[];
}

export type DbOperation = 
  | 'connect'
  | 'query'
  | 'fetchTables'
  | 'fetchSchema'
  | 'transaction'
  | 'healthCheck'
  | 'disconnect';

/**
 * Standardized error handler for database operations
 */
export function handleDatabaseError(
  operation: DbOperation, 
  error: any, 
  database: string, 
  query?: string
): DatabaseError {
  // Create a standardized error object
  const dbError: DatabaseError = new Error(
    `Database error during ${operation}: ${error.message}`
  );
  
  // Add error details
  dbError.name = 'DatabaseError';
  dbError.code = error.code || error.errno || 'UNKNOWN';
  dbError.sqlState = error.sqlState || error.state;
  dbError.query = query;
  
  // Attach the original error
  dbError.cause = error;
  
  return dbError;
}