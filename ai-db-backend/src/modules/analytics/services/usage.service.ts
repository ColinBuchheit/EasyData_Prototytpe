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
  ): Promise<void> {
    try {
      const client = await getMongoClient();
      
      const metric: UsageMetric = {
        userId,
        action,
        timestamp: new Date(),
        resourceId: details?.resourceId,
        resourceType: details?.resourceType,
        details: details
      };
      
      await client.db().collection('usage_metrics').insertOne(metric);
    } catch (error) {
      usageLogger.error(`Error tracking user action: ${(error as Error).message}`);
      // Non-blocking operation, so just log the error
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
   * Get queries per user
   */
  static async getQueriesPerUser(limit = 10, startDate?: Date, endDate?: Date): Promise<{ userId: number; queryCount: number }[]> {
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
            $limit: limit
          }
        ])
        .toArray();
      
      return result;
    } catch (error) {
      usageLogger.error(`Error getting queries per user: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get most used databases
   */
  static async getMostUsedDatabases(limit = 10, startDate?: Date, endDate?: Date): Promise<{ dbId: number; name: string; count: number }[]> {
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
      
      const result = await client.db().collection('usage_metrics')
        .aggregate([
          {
            $match: matchStage
          },
          {
            $group: {
              _id: "$details.dbId",
              count: { $sum: 1 },
              name: { $first: "$details.dbName" }
            }
          },
          {
            $project: {
              dbId: "$_id",
              name: 1,
              count: 1,
              _id: 0
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $limit: limit
          }
        ])
        .toArray();
      
      return result;
    } catch (error) {
      usageLogger.error(`Error getting most used databases: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get usage report
   */
  static async getUsageReport(startDate?: Date, endDate?: Date): Promise<UsageReport> {
    try {
      const [activeUsersDaily, activeUsersWeekly, activeUsersMonthly, totalQueries, queriesPerUser, mostUsedDatabases] = await Promise.all([
        this.getActiveUsers('daily'),
        this.getActiveUsers('weekly'),
        this.getActiveUsers('monthly'),
        this.getTotalQueries(startDate, endDate),
        this.getQueriesPerUser(10, startDate, endDate),
        this.getMostUsedDatabases(10, startDate, endDate)
      ]);
      
      const client = await getMongoClient();
      const matchStage: any = {
        action: { $in: ['execute_query', 'ai_query', 'multi_db_query'] }
      };
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      const queryTypes = await client.db().collection('usage_metrics')
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
          }
        ])
        .toArray();
      
      return {
        activeUsers: {
          daily: activeUsersDaily,
          weekly: activeUsersWeekly,
          monthly: activeUsersMonthly
        },
        totalQueries,
        queriesPerUser,
        mostUsedDatabases,
        queryTypes
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
        queryTypes: []
      };
    }
  }
}

export default UsageService;