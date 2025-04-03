// src/modules/query/services/result.service.ts

import { createContextLogger } from "../../../config/logger";
import { getMongoClient } from "../../../config/db";
import { QueryResult } from "../models/result.model";

const resultLogger = createContextLogger("ResultService");

export class ResultService {
  /**
   * Store query result for later reference
   */
  static async storeQueryResult(
    userId: number, 
    dbId: number, 
    query: string, 
    result: any, 
    executionTimeMs: number
  ): Promise<string | null> {
    try {
      const client = await getMongoClient();
      
      const document = {
        userId,
        dbId,
        query,
        result,
        executionTimeMs,
        timestamp: new Date()
      };
      
      const insertResult = await client.db().collection('query_results').insertOne(document);
      return insertResult.insertedId.toString();
    } catch (error) {
      resultLogger.error(`Error storing query result: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Retrieve stored query result by ID
   */
  static async getQueryResultById(resultId: string): Promise<any | null> {
    try {
      const client = await getMongoClient();
      const { ObjectId } = require('mongodb');
      
      const result = await client.db().collection('query_results').findOne({
        _id: new ObjectId(resultId)
      });
      
      return result;
    } catch (error) {
      resultLogger.error(`Error retrieving query result: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get recent query results for a user
   */
  static async getRecentResults(userId: number, limit = 10): Promise<any[]> {
    try {
      const client = await getMongoClient();
      
      const results = await client.db().collection('query_results')
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
        
      return results;
    } catch (error) {
      resultLogger.error(`Error retrieving recent results: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Transform raw query result for display
   */
  static formatQueryResult(rawResult: any): QueryResult {
    // Handle different result formats
    if (!rawResult) {
      return {
        success: false,
        message: "No result data available"
      };
    }
    
    // If it's already in our format, return as is
    if (rawResult.success !== undefined) {
      return rawResult;
    }
    
    // If it's an array, assume it's rows from a database
    if (Array.isArray(rawResult)) {
      return {
        success: true,
        rows: rawResult,
        rowCount: rawResult.length,
        message: `Retrieved ${rawResult.length} rows`
      };
    }
    
    // Handle objects
    return {
      success: true,
      rows: [rawResult],
      rowCount: 1,
      message: "Query executed successfully"
    };
  }

  /**
   * Delete old query results to manage storage
   */
  static async cleanupOldResults(olderThanDays = 30): Promise<number> {
    try {
      const client = await getMongoClient();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const result = await client.db().collection('query_results').deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      resultLogger.info(`Deleted ${result.deletedCount} old query results`);
      return result.deletedCount || 0;
    } catch (error) {
      resultLogger.error(`Error cleaning up old results: ${(error as Error).message}`);
      return 0;
    }
  }
}

export default ResultService;