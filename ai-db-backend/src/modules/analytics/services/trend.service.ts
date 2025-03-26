// src/modules/analytics/services/trend.service.ts

import { getMongoClient } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { DataPoint, TimeInterval, Trend, TrendComparison, TrendFilter } from "../models/trend.model";

const trendLogger = createContextLogger("TrendAnalytics");

export class TrendService {
  /**
   * Get trend data for a metric
   */
  static async getTrend(filter: TrendFilter): Promise<Trend | null> {
    try {
      const { metricName, interval, startDate, endDate, userId, dbId, dimension } = filter;
      
      // Default date range if not provided
      const endDateValue = endDate || new Date();
      let startDateValue = startDate;
      
      if (!startDateValue) {
        startDateValue = new Date(endDateValue);
        switch (interval) {
          case 'hourly':
            startDateValue.setDate(startDateValue.getDate() - 1); // Last 24 hours
            break;
          case 'daily':
            startDateValue.setDate(startDateValue.getDate() - 30); // Last 30 days
            break;
          case 'weekly':
            startDateValue.setDate(startDateValue.getDate() - 90); // Last ~12 weeks
            break;
          case 'monthly':
            startDateValue.setFullYear(startDateValue.getFullYear() - 1); // Last 12 months
            break;
          case 'quarterly':
            startDateValue.setFullYear(startDateValue.getFullYear() - 2); // Last 8 quarters
            break;
          case 'yearly':
            startDateValue.setFullYear(startDateValue.getFullYear() - 5); // Last 5 years
            break;
        }
      }
      
      const client = await getMongoClient();
      const collection = await this.getCollectionForMetric(metricName);
      
      if (!collection) {
        throw new Error(`Invalid metric name: ${metricName}`);
      }
      
      // Build match stage
      const matchStage: any = {
        timestamp: {
          $gte: startDateValue,
          $lte: endDateValue
        }
      };
      
      if (userId) {
        matchStage.userId = userId;
      }
      
      if (dbId) {
        matchStage.dbId = dbId;
      }
      
      if (dimension) {
        matchStage.dimension = dimension;
      }
      
      // Build group stage based on interval
      const groupStage: any = {
        _id: this.getGroupIdForInterval(interval)
      };
      
      // Different metrics will have different value fields
      switch (metricName) {
        case 'queryCount':
          groupStage.value = { $sum: 1 };
          break;
        case 'executionTime':
          groupStage.value = { $avg: "$executionTimeMs" };
          break;
        case 'errorCount':
          groupStage.value = { $sum: 1 };
          break;
        case 'activeUsers':
          groupStage.value = { $addToSet: "$userId" };
          break;
        default:
          groupStage.value = { $sum: 1 };
      }
      
      // For activeUsers, we need to count unique users
      const projectStage: any = {
        timestamp: "$_id",
        value: metricName === 'activeUsers' ? { $size: "$value" } : "$value",
        _id: 0
      };
      
      const pipeline = [
        { $match: matchStage },
        { $group: groupStage },
        { $project: projectStage },
        { $sort: { timestamp: 1 } }
      ];
      
      const dataPoints = await client.db().collection(collection)
        .aggregate(pipeline)
        .toArray();
      
      return {
        metricName,
        interval,
        dataPoints: dataPoints.map(dp => ({
          timestamp: this.parseTimestamp(dp.timestamp, interval),
          value: dp.value
        })),
        startDate: startDateValue,
        endDate: endDateValue
      };
    } catch (error) {
      trendLogger.error(`Error getting trend data: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Compare trends between two time periods
   */
  static async compareTrends(
    metricName: string,
    interval: TimeInterval,
    currentStartDate: Date,
    currentEndDate: Date,
    userId?: number,
    dbId?: number,
    dimension?: string
  ): Promise<TrendComparison | null> {
    try {
      // Calculate previous period of same duration
      const duration = currentEndDate.getTime() - currentStartDate.getTime();
      const previousEndDate = new Date(currentStartDate.getTime() - 1); // 1ms before current start
      const previousStartDate = new Date(previousEndDate.getTime() - duration);
      
      // Get current period trend
      const currentTrend = await this.getTrend({
        metricName,
        interval,
        startDate: currentStartDate,
        endDate: currentEndDate,
        userId,
        dbId,
        dimension
      });
      
      // Get previous period trend
      const previousTrend = await this.getTrend({
        metricName,
        interval,
        startDate: previousStartDate,
        endDate: previousEndDate,
        userId,
        dbId,
        dimension
      });
      
      if (!currentTrend || !previousTrend) {
        return null;
      }
      
      // Calculate total values for both periods
      const currentTotal = currentTrend.dataPoints.reduce((sum, dp) => sum + dp.value, 0);
      const previousTotal = previousTrend.dataPoints.reduce((sum, dp) => sum + dp.value, 0);
      
      // Calculate percent change
      let percentChange = 0;
      if (previousTotal !== 0) {
        percentChange = ((currentTotal - previousTotal) / previousTotal) * 100;
      } else if (currentTotal !== 0) {
        percentChange = 100; // If previous was 0 and current is not, that's 100% increase
      }
      
      return {
        name: metricName,
        currentPeriod: currentTrend,
        previousPeriod: previousTrend,
        percentChange
      };
    } catch (error) {
      trendLogger.error(`Error comparing trends: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get collection name for a metric
   */
  private static async getCollectionForMetric(metricName: string): Promise<string | null> {
    switch (metricName) {
      case 'queryCount':
      case 'activeUsers':
        return 'usage_metrics';
      case 'executionTime':
        return 'performance_metrics';
      case 'errorCount':
        return 'error_metrics';
      case 'securityEvents':
        return 'security_metrics';
      default:
        return null;
    }
  }

  /**
   * Get MongoDB group ID based on time interval
   */
  private static getGroupIdForInterval(interval: TimeInterval): any {
    switch (interval) {
      case 'hourly':
        return {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" },
          hour: { $hour: "$timestamp" }
        };
      case 'daily':
        return {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" }
        };
      case 'weekly':
        return {
          year: { $year: "$timestamp" },
          week: { $week: "$timestamp" }
        };
      case 'monthly':
        return {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" }
        };
      case 'quarterly':
        return {
          year: { $year: "$timestamp" },
          quarter: { $ceil: { $divide: [{ $month: "$timestamp" }, 3] } }
        };
      case 'yearly':
        return {
          year: { $year: "$timestamp" }
        };
    }
  }

  /**
   * Parse grouped timestamp into a Date object
   */
  private static parseTimestamp(groupId: any, interval: TimeInterval): Date {
    const date = new Date();
    
    switch (interval) {
      case 'hourly':
        date.setFullYear(groupId.year, groupId.month - 1, groupId.day);
        date.setHours(groupId.hour, 0, 0, 0);
        break;
      case 'daily':
        date.setFullYear(groupId.year, groupId.month - 1, groupId.day);
        date.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        // Convert ISO week to a date (approximate)
        const januaryFirst = new Date(groupId.year, 0, 1);
        const dayOffset = 1 + (4 - januaryFirst.getDay()) % 7;
        date.setFullYear(groupId.year, 0, dayOffset + (groupId.week - 1) * 7);
        date.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        date.setFullYear(groupId.year, groupId.month - 1, 1);
        date.setHours(0, 0, 0, 0);
        break;
      case 'quarterly':
        date.setFullYear(groupId.year, (groupId.quarter - 1) * 3, 1);
        date.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        date.setFullYear(groupId.year, 0, 1);
        date.setHours(0, 0, 0, 0);
        break;
    }
    
    return date;
  }
}

export default TrendService;