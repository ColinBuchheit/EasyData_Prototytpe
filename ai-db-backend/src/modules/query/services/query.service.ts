// src/modules/query/services/query.service.ts

import { createContextLogger } from "../../../config/logger";
import { getMongoClient } from "../../../config/db";
import { ConnectionsService } from "../../database/services/connections.service";
import { SchemaService } from "../../database/services/schema.service";
import { Query, QueryRequest, QueryResult, QueryStatus } from "../models/query.model";
import { QueryHistoryRecord } from "../models/result.model";

const queryLogger = createContextLogger("QueryService");

export class QueryService {
  /**
   * Execute a query on a specific database
   */
  static async executeQuery(userId: number, queryRequest: QueryRequest): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const { dbId, query } = queryRequest;
      
      // Validate query parameters
      if (!dbId || typeof dbId !== "number") {
        return { 
          success: false, 
          error: "Missing or invalid database ID",
          message: "Please provide a valid database ID."
        };
      }
      
      if (!query || typeof query !== "string") {
        return { 
          success: false, 
          error: "Missing or invalid query",
          message: "Please provide a valid SQL query."
        };
      }
      
      // Get the database connection
      const db = await ConnectionsService.getConnectionById(userId, dbId);
      if (!db) {
        return { 
          success: false, 
          error: "Database not found",
          message: `Database with ID ${dbId} not found or you don't have access to it.`
        };
      }
      
      // Execute the query
      const result = await ConnectionsService.executeQuery(db, query);
      
      const executionTimeMs = Date.now() - startTime;
      const rowCount = Array.isArray(result) ? result.length : 0;
      
      // Record query history
      await this.recordQueryHistory({
        userId,
        dbId,
        queryText: query,
        executionTimeMs,
        rowCount,
        timestamp: new Date()
      });
      
      return {
        success: true,
        rows: result,
        rowCount,
        executionTimeMs,
        message: `Query executed successfully in ${executionTimeMs}ms.`
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      queryLogger.error(`Error executing query: ${(error as Error).message}`);
      
      return {
        success: false,
        executionTimeMs,
        error: (error as Error).message,
        message: "Failed to execute query."
      };
    }
  }
  
  /**
   * Validate a query against the database schema
   */
  static async validateQuery(userId: number, dbId: number, query: string): Promise<boolean> {
    try {
      // Get the database connection
      const db = await ConnectionsService.getConnectionById(userId, dbId);
      if (!db) {
        return false;
      }
      
      // Call schema service to validate
      const validationResult = await SchemaService.validateQueryAgainstSchema(query, db.db_type);
      return validationResult.isValid;
    } catch (error) {
      queryLogger.error(`Error validating query: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Record a query in the history for analytics and context tracking
   */
  static async recordQueryHistory(record: QueryHistoryRecord): Promise<void> {
    try {
      const client = await getMongoClient();
      await client.db().collection('query_history').insertOne(record);
    } catch (error) {
      queryLogger.error(`Error recording query history: ${(error as Error).message}`);
      // Non-critical operation, so don't throw
    }
  }
  
  /**
   * Get recent query history for a user
   */
  static async getQueryHistory(userId: number, limit = 10): Promise<QueryHistoryRecord[]> {
    try {
      const client = await getMongoClient();
      const history = await client.db().collection('query_history')
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      
      return history as QueryHistoryRecord[];
    } catch (error) {
      queryLogger.error(`Error fetching query history: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Get query history for a specific database
   */
  static async getQueryHistoryForDatabase(userId: number, dbId: number, limit = 10): Promise<QueryHistoryRecord[]> {
    try {
      const client = await getMongoClient();
      const history = await client.db().collection('query_history')
        .find({ userId, dbId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      
      return history as QueryHistoryRecord[];
    } catch (error) {
      queryLogger.error(`Error fetching database query history: ${(error as Error).message}`);
      return [];
    }
  }
}

export default QueryService;