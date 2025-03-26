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
  static async trackQueryPerformance(metric: PerformanceMetric): Promise<void> {
    try {
      const client = await getMongoClient();
      await client.db().collection('performance_metrics').insertOne(metric);
    } catch (error) {
      perfLogger.error(`Error tracking query performance: ${(error as Error).message}`);
      // Non-blocking operation, so just log the error
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
   * Get slowest queries
   */
  static async getSlowestQueries(limit = 10, startDate?: Date, endDate?: Date): Promise<any[]> {
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
      
      const result = await client.db().collection('query_history')
        .find(matchStage)
        .sort({ executionTimeMs: -1 })
        .limit(limit)
        .toArray();
      
      return result;
    } catch (error) {
      perfLogger.error(`Error getting slowest queries: ${(error as Error).message}`);
      return [];
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
              queryCount: { $sum: 1 }
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
              queryCount: 1,
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
  static async getAIResponseTimes(startDate?: Date, endDate?: Date): Promise<{ average: number; p95: number; p99: number }> {
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
        return { average: 0, p95: 0, p99: 0 };
      }
      
      // Calculate average
      const sum = times.reduce((acc, curr) => acc + curr.executionTimeMs, 0);
      const average = sum / times.length;
      
      // Calculate percentiles
      const sortedTimes = times.map(t => t.executionTimeMs).sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p99Index = Math.floor(sortedTimes.length * 0.99);
      
      return {
        average,
        p95: sortedTimes[p95Index] || 0,
        p99: sortedTimes[p99Index] || 0
      };
    } catch (error) {
      perfLogger.error(`Error getting AI response times: ${(error as Error).message}`);
      return { average: 0, p95: 0, p99: 0 };
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
        this.getSlowestQueries(10, startDate, endDate),
        this.getDatabasePerformance(startDate, endDate),
        this.getAIResponseTimes(startDate, endDate)
      ]);
      
      return {
        averageQueryTime,
        slowestQueries,
        databasePerformance,
        aiResponseTimes
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
        }
      };
    }
  }
}

export default PerformanceService;