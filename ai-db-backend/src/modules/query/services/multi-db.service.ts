// src/modules/query/services/multi-db.service.ts

import { createContextLogger } from "../../../config/logger";
import { ConnectionsService } from "../../database/services/connections.service";
import { getMongoClient } from "../../../config/db";
import { MultiDbQueryResult } from "../models/result.model";
import { AIAgentService } from "./ai-agent.service";

const multiDbLogger = createContextLogger("MultiDbService");

export class MultiDbService {
  /**
   * Execute a query across multiple databases
   */
  static async handleMultiDatabaseQuery(
    userId: number, 
    task: string,
    dbIds: number[]
  ): Promise<MultiDbQueryResult> {
    try {
      multiDbLogger.info(`Processing multi-database query for user ${userId} across ${dbIds.length} databases`);
      
      if (dbIds.length === 0) {
        return { 
          success: false, 
          error: "No databases specified" 
        };
      }
      
      // Fetch database connections
      const databases = [];
      for (const dbId of dbIds) {
        const db = await ConnectionsService.getConnectionById(userId, dbId);
        if (db) databases.push(db);
      }
      
      if (databases.length === 0) {
        return { 
          success: false, 
          error: "Could not access any of the specified databases" 
        };
      }
      
      // Call the AI agent to decompose query per database
      const aiResponse = await AIAgentService.runOrchestration({
        operation: "multi_db_query",
        task,
        databases: databases.map(db => ({
          id: db.id,
          dbType: db.db_type,
          dbName: db.database_name
        }))
      });
      
      if (!aiResponse.success) {
        return { 
          success: false, 
          error: aiResponse.error || "Failed to analyze multi-database query" 
        };
      }
      
      // Execute sub-queries
      const results: Record<string, any> = {};
      const subQueries = aiResponse.subQueries;
      
      for (const dbId in subQueries) {
        try {
          const db = databases.find(d => d.id === parseInt(dbId));
          if (!db) continue;
          
          const subQuery = subQueries[dbId];
          const result = await ConnectionsService.executeQuery(db, subQuery);
          
          // Record this query in history
          await this.recordMultiDbQuery(userId, parseInt(dbId), task, subQuery);
          
          results[dbId] = {
            dbName: db.connection_name || db.database_name,
            dbType: db.db_type,
            data: result
          };
        } catch (dbError) {
          multiDbLogger.error(`Error executing subquery on database ${dbId}: ${(dbError as Error).message}`);
          results[dbId] = { 
            error: (dbError as Error).message,
            dbName: databases.find(d => d.id === parseInt(dbId))?.database_name || `Database ${dbId}`
          };
        }
      }
      
      // Record the overall multi-db query
      await this.recordMultiDbQuery(userId, dbIds, task);
      
      // Return aggregated results
      return {
        success: true,
        results,
        message: `Query executed across ${Object.keys(results).length} databases`
      };
    } catch (error) {
      multiDbLogger.error(`Error executing multi-database query: ${(error as Error).message}`);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }
  
  /**
   * Record a multi-database query in history
   */
  static async recordMultiDbQuery(
    userId: number, 
    dbIds: number | number[], 
    task: string,
    query?: string
  ): Promise<void> {
    try {
      const client = await getMongoClient();
      
      await client.db().collection('multi_db_queries').insertOne({
        userId,
        databases_involved: Array.isArray(dbIds) ? dbIds : [dbIds],
        task,
        query: query || task,
        timestamp: new Date()
      });
    } catch (error) {
      multiDbLogger.error(`Error recording multi-db query: ${(error as Error).message}`);
      // Non-critical operation, so we just log the error
    }
  }
  
  /**
   * Get multi-database query history for a user
   */
  static async getMultiDbQueryHistory(userId: number, limit = 10): Promise<any[]> {
    try {
      const client = await getMongoClient();
      
      const history = await client.db().collection('multi_db_queries')
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
        
      return history;
    } catch (error) {
      multiDbLogger.error(`Error fetching multi-db query history: ${(error as Error).message}`);
      return [];
    }
  }
}

export default MultiDbService;