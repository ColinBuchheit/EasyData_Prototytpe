// src/modules/query/services/fallback.service.ts

import { createContextLogger } from "../../../config/logger";
import { ConnectionsService } from "../../database/services/connections.service";
import { SchemaService } from "../../database/services/schema.service";
import { QueryResult } from "../models/result.model";

const fallbackLogger = createContextLogger("FallbackService");

/**
 * Fallback service to handle simple queries when AI is unavailable
 */
export class FallbackService {
  /**
   * Process a basic natural language query using simple rules
   * This is a limited fallback when AI is unavailable
   */
  static async processBasicQuery(userId: number, dbId: number, task: string): Promise<QueryResult> {
    try {
      fallbackLogger.info(`Using fallback processing for user ${userId}, task: ${task}`);
      
      // Get database connection
      const db = await ConnectionsService.getConnectionById(userId, dbId);
      if (!db) {
        return {
          success: false,
          error: "Database not found",
          message: "Cannot find the specified database."
        };
      }
      
      // Get table information
      const tables = await ConnectionsService.fetchTablesFromConnection(db);
      if (!tables || tables.length === 0) {
        return {
          success: false,
          error: "No tables found in database",
          message: "The database doesn't contain any tables."
        };
      }
      
      // Generate a simple query based on keywords
      let query: string;
      let tableName = tables[0]; // Default to first table
      
      // Try to determine which table to query
      for (const table of tables) {
        if (task.toLowerCase().includes(table.toLowerCase())) {
          tableName = table;
          break;
        }
      }
      
      // Fetch table schema for the selected table
      const schema = await ConnectionsService.fetchSchemaFromConnection(db, tableName);
      
      // Default to SELECT * with limit 10
      query = `SELECT * FROM ${tableName} LIMIT 10`;
      
      // Try to detect if user wants a count
      if (task.toLowerCase().includes("count") || task.toLowerCase().includes("how many")) {
        query = `SELECT COUNT(*) FROM ${tableName}`;
      }
      
      fallbackLogger.info(`Generated fallback query: ${query}`);
      
      // Execute the query
      const result = await ConnectionsService.executeQuery(db, query);
      
      return {
        success: true,
        rows: result,
        rowCount: Array.isArray(result) ? result.length : 0,
        message: `Basic query executed. The AI service is currently unavailable, so this is a simplified fallback query. Generated query: ${query}`
      };
    } catch (error) {
      fallbackLogger.error(`Error in fallback processing: ${(error as Error).message}`);
      return {
        success: false,
        error: "Fallback processing failed",
        message: "Unable to generate a fallback query while AI is unavailable."
      };
    }
  }
}

export default FallbackService;
