// src/modules/analytics/services/usage.service.ts

import { getMongoClient } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { UsageMetric, UserAction } from "../models/metric.model";
import { UsageReport } from "../models/report.model";

const usageLogger = createContextLogger("UsageAnalytics");

export class UsageService {
  /**
   * Track user action
   */
  static async trackUserAction(
    userId: number, 
    action: UserAction, 
    details?: { 
      resourceId?: number; 
      resourceType?: string; 
      [key: string]: any; 
    }
  ): Promise<boolean> {
    try {
      const client = await getMongoClient();
      
      const metric: UsageMetric = {
        userId,
        action,
        timestamp: new Date(),
        resourceId: details?.resourceId,
        resourceType: details?.resourceType,
        details
      };
      
      await client.db().collection('usage_metrics').insertOne(metric);
      return true;
    } catch (error) {
      usageLogger.error(`Error tracking user action: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Get active users count
   */
  static async getActiveUsers(period: 'daily' | 'weekly' | 'monthly'): Promise<number> {
    try {
      const client = await getMongoClient();
      const now = new Date();
      let startDate: Date;
      
      // Calculate the start date based on period
      switch (period) {
        case 'daily':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 1);
          break;
        case 'weekly':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      const result = await client.db().collection('usage_metrics')
        .aggregate([
          {
            $match: {
              timestamp: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: "$userId"
            }
          },
          {
            $count: "activeUsers"
          }
        ])
        .toArray();
      
      return result.length > 0 ? result[0].activeUsers : 0;
    } catch (error) {
      usageLogger.error(`Error getting active users: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Get total query count
   */
  static async getTotalQueries(startDate?: Date, endDate?: Date): Promise<number> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {
        action: { $in: ['execute_query', 'ai_query', 'multi_db_query'] }
      };
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      const result = await client.db().collection('usage_metrics')
        .countDocuments(matchStage);
      
      return result;
    } catch (error) {
      usageLogger.error(`Error getting total queries: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Get queries per user with pagination
   */
  static async getQueriesPerUser(
    limit = 10, 
    startDate?: Date, 
    endDate?: Date,
    page = 1
  ): Promise<{ userId: number; queryCount: number }[]> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {
        action: { $in: ['execute_query', 'ai_query', 'multi_db_query'] }
      };
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      const skip = (page - 1) * limit;
      
      const result = await client.db().collection('usage_metrics')
        .aggregate([
          {
            $match: matchStage
          },
          {
            $group: {
              _id: "$userId",
              queryCount: { $sum: 1 }
            }
          },
          {
            $project: {
              userId: "$_id",
              queryCount: 1,
              _id: 0
            }
          },
          {
            $sort: { queryCount: -1 }
          },
          {
            $skip: skip
          },
          {
            $limit: limit
          }
        ])
        .toArray();
      
      return result as unknown as { userId: number; queryCount: number }[];
    } catch (error) {
      usageLogger.error(`Error getting queries per user: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get most used databases
   */
  static async getMostUsedDatabases(
    limit = 10, 
    startDate?: Date, 
    endDate?: Date,
    page = 1
  ): Promise<{ dbId: number; name: string; count: number; userId?: number }[]> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {
        action: { $in: ['execute_query', 'ai_query'] },
        'details.dbId': { $exists: true }
      };
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      const skip = (page - 1) * limit;
      
      const result = await client.db().collection('usage_metrics')
        .aggregate([
          {
            $match: matchStage
          },
          {
            $group: {
              _id: "$details.dbId",
              count: { $sum: 1 },
              name: { $first: "$details.dbName" },
              userId: { $first: "$userId" }
            }
          },
          {
            $project: {
              dbId: "$_id",
              name: 1,
              count: 1,
              userId: 1,
              _id: 0
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $skip: skip
          },
          {
            $limit: limit
          }
        ])
        .toArray();
      
      return result as unknown as { dbId: number; name: string; count: number; userId?: number }[];
    } catch (error) {
      usageLogger.error(`Error getting most used databases: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get query types distribution
   */
  static async getQueryTypeDistribution(startDate?: Date, endDate?: Date): Promise<{ type: string; count: number }[]> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {
        action: { $in: ['execute_query', 'ai_query', 'multi_db_query'] }
      };
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      const result = await client.db().collection('usage_metrics')
        .aggregate([
          {
            $match: matchStage
          },
          {
            $group: {
              _id: "$action",
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              type: "$_id",
              count: 1,
              _id: 0
            }
          },
          {
            $sort: { count: -1 }
          }
        ])
        .toArray();
      
      return result as unknown as { type: string; count: number }[];
    } catch (error) {
      usageLogger.error(`Error getting query type distribution: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get usage report
   */
  static async getUsageReport(startDate?: Date, endDate?: Date): Promise<UsageReport> {
    try {
      const [
        activeUsersDaily,
        activeUsersWeekly,
        activeUsersMonthly,
        totalQueries,
        queriesPerUser,
        mostUsedDatabases,
        queryTypes
      ] = await Promise.all([
        this.getActiveUsers('daily'),
        this.getActiveUsers('weekly'),
        this.getActiveUsers('monthly'),
        this.getTotalQueries(startDate, endDate),
        this.getQueriesPerUser(10, startDate, endDate),
        this.getMostUsedDatabases(10, startDate, endDate),
        this.getQueryTypeDistribution(startDate, endDate)
      ]);
      
      return {
        activeUsers: {
          daily: activeUsersDaily,
          weekly: activeUsersWeekly,
          monthly: activeUsersMonthly
        },
        totalQueries,
        queriesPerUser,
        mostUsedDatabases,
        queryTypes,
        generatedAt: new Date()
      };
    } catch (error) {
      usageLogger.error(`Error generating usage report: ${(error as Error).message}`);
      
      // Return empty report on error
      return {
        activeUsers: {
          daily: 0,
          weekly: 0,
          monthly: 0
        },
        totalQueries: 0,
        queriesPerUser: [],
        mostUsedDatabases: [],
        queryTypes: [],
        generatedAt: new Date()
      };
    }
  }

  /**
   * Create necessary indexes for usage metrics
   */
  static async ensureIndexes(): Promise<boolean> {
    try {
      const client = await getMongoClient();
      
      // Create indexes for common query patterns
      await client.db().collection('usage_metrics').createIndex({ userId: 1 });
      await client.db().collection('usage_metrics').createIndex({ timestamp: 1 });
      await client.db().collection('usage_metrics').createIndex({ action: 1 });
      await client.db().collection('usage_metrics').createIndex({ 'details.dbId': 1 });
      
      // Compound indexes for common queries
      await client.db().collection('usage_metrics').createIndex({ userId: 1, timestamp: 1 });
      await client.db().collection('usage_metrics').createIndex({ action: 1, timestamp: 1 });
      
      usageLogger.info("Created usage metrics indexes");
      return true;
    } catch (error) {
      usageLogger.error(`Error creating usage metrics indexes: ${(error as Error).message}`);
      return false;
    }
  }
}

export default UsageService;