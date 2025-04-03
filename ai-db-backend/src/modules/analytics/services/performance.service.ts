// src/modules/analytics/services/performance.service.ts

import { getMongoClient } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { PerformanceMetric } from "../models/metric.model";
import { PerformanceReport } from "../models/report.model";

const perfLogger = createContextLogger("PerformanceAnalytics");

export class PerformanceService {
  /**
   * Track query performance
   */
  static async trackQueryPerformance(metric: PerformanceMetric): Promise<boolean> {
    try {
      // Validate the metric
      if (metric.executionTimeMs < 0) {
        perfLogger.warn("Invalid execution time provided for performance tracking");
        return false;
      }
      
      const client = await getMongoClient();
      await client.db().collection('performance_metrics').insertOne(metric);
      return true;
    } catch (error) {
      perfLogger.error(`Error tracking query performance: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Get average query execution time
   */
  static async getAverageQueryTime(startDate?: Date, endDate?: Date, dbId?: number): Promise<number> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {
        success: true
      };
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      if (dbId) {
        matchStage.dbId = dbId;
      }
      
      const result = await client.db().collection('performance_metrics')
        .aggregate([
          {
            $match: matchStage
          },
          {
            $group: {
              _id: null,
              averageTime: { $avg: "$executionTimeMs" }
            }
          }
        ])
        .toArray();
      
      return result.length > 0 ? result[0].averageTime : 0;
    } catch (error) {
      perfLogger.error(`Error getting average query time: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Get slowest queries with pagination
   */
  static async getSlowestQueries(
    limit = 10, 
    page = 1,
    startDate?: Date, 
    endDate?: Date
  ): Promise<{
    data: any[];
    total: number;
    pages: number;
  }> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {
        success: true
      };
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Get total count for pagination
      const totalCount = await client.db().collection('query_history')
        .countDocuments(matchStage);
      
      // Get paginated results
      const result = await client.db().collection('query_history')
        .find(matchStage)
        .sort({ executionTimeMs: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      const totalPages = Math.ceil(totalCount / limit);
      
      return {
        data: result,
        total: totalCount,
        pages: totalPages
      };
    } catch (error) {
      perfLogger.error(`Error getting slowest queries: ${(error as Error).message}`);
      return {
        data: [],
        total: 0,
        pages: 0
      };
    }
  }

  /**
   * Get database performance metrics
   */
  static async getDatabasePerformance(startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {
        success: true,
        dbId: { $exists: true }
      };
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      const result = await client.db().collection('performance_metrics')
        .aggregate([
          {
            $match: matchStage
          },
          {
            $group: {
              _id: "$dbId",
              avgExecutionTimeMs: { $avg: "$executionTimeMs" },
              minExecutionTimeMs: { $min: "$executionTimeMs" },
              maxExecutionTimeMs: { $max: "$executionTimeMs" },
              queryCount: { $sum: 1 },
              userId: { $first: "$userId" }
            }
          },
          {
            $lookup: {
              from: "user_databases",
              localField: "_id",
              foreignField: "id",
              as: "dbInfo"
            }
          },
          {
            $project: {
              dbId: "$_id",
              name: { $ifNull: [{ $arrayElemAt: ["$dbInfo.connection_name", 0] }, { $arrayElemAt: ["$dbInfo.database_name", 0] }] },
              avgExecutionTimeMs: 1,
              minExecutionTimeMs: 1,
              maxExecutionTimeMs: 1,
              queryCount: 1,
              userId: 1,
              _id: 0
            }
          },
          {
            $sort: { avgExecutionTimeMs: -1 }
          }
        ])
        .toArray();
      
      return result;
    } catch (error) {
      perfLogger.error(`Error getting database performance: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get AI response time metrics
   */
  static async getAIResponseTimes(startDate?: Date, endDate?: Date): Promise<{ 
    average: number; 
    p95: number; 
    p99: number;
    min: number;
    max: number;
    count: number;
  }> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {
        queryType: "ai"
      };
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      // Get all AI query times for percentile calculations
      const times = await client.db().collection('performance_metrics')
        .find(matchStage)
        .project({ executionTimeMs: 1 })
        .toArray();
      
      if (times.length === 0) {
        return { 
          average: 0, 
          p95: 0, 
          p99: 0,
          min: 0,
          max: 0,
          count: 0
        };
      }
      
      // Calculate average
      const executionTimes = times.map(t => t.executionTimeMs);
      const sum = executionTimes.reduce((acc, curr) => acc + curr, 0);
      const average = sum / times.length;
      
      // Calculate min and max
      const min = Math.min(...executionTimes);
      const max = Math.max(...executionTimes);
      
      // Calculate percentiles
      const sortedTimes = [...executionTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p99Index = Math.floor(sortedTimes.length * 0.99);
      
      return {
        average,
        p95: sortedTimes[p95Index] || 0,
        p99: sortedTimes[p99Index] || 0,
        min,
        max,
        count: times.length
      };
    } catch (error) {
      perfLogger.error(`Error getting AI response times: ${(error as Error).message}`);
      return { 
        average: 0, 
        p95: 0, 
        p99: 0,
        min: 0,
        max: 0,
        count: 0
      };
    }
  }

  /**
   * Get full performance report
   */
  static async getPerformanceReport(startDate?: Date, endDate?: Date): Promise<PerformanceReport> {
    try {
      const [
        averageQueryTime,
        slowestQueries,
        databasePerformance,
        aiResponseTimes
      ] = await Promise.all([
        this.getAverageQueryTime(startDate, endDate),
        this.getSlowestQueries(10, 1, startDate, endDate),
        this.getDatabasePerformance(startDate, endDate),
        this.getAIResponseTimes(startDate, endDate)
      ]);
      
      return {
        averageQueryTime,
        slowestQueries: slowestQueries.data,
        databasePerformance,
        aiResponseTimes: {
          average: aiResponseTimes.average,
          p95: aiResponseTimes.p95,
          p99: aiResponseTimes.p99
        },
        generatedAt: new Date()
      };
    } catch (error) {
      perfLogger.error(`Error generating performance report: ${(error as Error).message}`);
      
      // Return empty report on error
      return {
        averageQueryTime: 0,
        slowestQueries: [],
        databasePerformance: [],
        aiResponseTimes: {
          average: 0,
          p95: 0,
          p99: 0
        },
        generatedAt: new Date()
      };
    }
  }

  /**
   * Create necessary indexes for performance metrics
   */
  static async ensureIndexes(): Promise<boolean> {
    try {
      const client = await getMongoClient();
      
      // Create indexes for performance_metrics collection
      await client.db().collection('performance_metrics').createIndex({ userId: 1 });
      await client.db().collection('performance_metrics').createIndex({ timestamp: 1 });
      await client.db().collection('performance_metrics').createIndex({ dbId: 1 });
      await client.db().collection('performance_metrics').createIndex({ queryType: 1 });
      await client.db().collection('performance_metrics').createIndex({ success: 1 });
      await client.db().collection('performance_metrics').createIndex({ executionTimeMs: 1 });
      
      // Create indexes for query_history collection
      await client.db().collection('query_history').createIndex({ userId: 1 });
      await client.db().collection('query_history').createIndex({ timestamp: 1 });
      await client.db().collection('query_history').createIndex({ executionTimeMs: 1 });
      
      // Compound indexes for common queries
      await client.db().collection('performance_metrics').createIndex({ userId: 1, timestamp: 1 });
      await client.db().collection('performance_metrics').createIndex({ dbId: 1, timestamp: 1 });
      await client.db().collection('performance_metrics').createIndex({ queryType: 1, timestamp: 1 });
      
      perfLogger.info("Created performance metrics indexes");
      return true;
    } catch (error) {
      perfLogger.error(`Error creating performance metrics indexes: ${(error as Error).message}`);
      return false;
    }
  }
}

export default PerformanceService;