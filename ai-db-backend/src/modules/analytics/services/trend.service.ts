// src/modules/analytics/services/trend.service.ts

import { getMongoClient } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { DataPoint, TimeInterval, Trend, TrendComparison, TrendFilter, TrendImpl } from "../models/trend.model";

const trendLogger = createContextLogger("TrendAnalytics");

export class TrendService {
  /**
   * Trend cache for frequently requested data
   * Map key format: metricName:interval:userId:startDate:endDate
   */
  private static trendCache: Map<string, {data: Trend, timestamp: Date}> = new Map();
  
  /**
   * Cache TTL in milliseconds (default: 5 minutes)
   */
  private static CACHE_TTL = 5 * 60 * 1000;

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
      
      // Check cache first
      const cacheKey = this.generateCacheKey(metricName, interval, userId, dbId, startDateValue, endDateValue);
      const cachedTrend = this.getFromCache(cacheKey);
      if (cachedTrend) {
        trendLogger.debug(`Returning cached trend for ${cacheKey}`);
        return cachedTrend;
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
        case 'securityEvents':
          groupStage.value = { $sum: 1 };
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
      
      // Convert to proper DataPoint objects
      const formattedDataPoints: DataPoint[] = dataPoints.map(dp => ({
        timestamp: this.parseTimestamp(dp.timestamp, interval),
        value: dp.value
      }));
      
      // Create the trend using the TrendImpl class
      const trend = new TrendImpl({
        metricName,
        interval,
        dataPoints: formattedDataPoints,
        startDate: startDateValue,
        endDate: endDateValue
      });
      
      // Save to cache
      this.addToCache(cacheKey, trend);
      
      return trend;
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
      
      // Use the utility function to create the comparison
      return {
        name: metricName,
        currentPeriod: currentTrend,
        previousPeriod: previousTrend,
        percentChange: this.calculatePercentChange(currentTrend, previousTrend),
        absoluteChange: this.calculateAbsoluteChange(currentTrend, previousTrend),
        isPositiveTrend: this.calculateAbsoluteChange(currentTrend, previousTrend) > 0
      };
    } catch (error) {
      trendLogger.error(`Error comparing trends: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Calculate the percentage change between two trends
   */
  private static calculatePercentChange(current: Trend, previous: Trend): number {
    const currentTotal = current.dataPoints.reduce((sum, point) => sum + point.value, 0);
    const previousTotal = previous.dataPoints.reduce((sum, point) => sum + point.value, 0);
    
    if (previousTotal === 0) {
      return currentTotal === 0 ? 0 : 100;
    }
    
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }

  /**
   * Calculate the absolute change between two trends
   */
  private static calculateAbsoluteChange(current: Trend, previous: Trend): number {
    const currentTotal = current.dataPoints.reduce((sum, point) => sum + point.value, 0);
    const previousTotal = previous.dataPoints.reduce((sum, point) => sum + point.value, 0);
    
    return currentTotal - previousTotal;
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

  /**
   * Generate a cache key for trend data
   */
  private static generateCacheKey(
    metricName: string,
    interval: TimeInterval,
    userId?: number,
    dbId?: number,
    startDate?: Date,
    endDate?: Date
  ): string {
    const userPart = userId ? userId.toString() : 'all';
    const dbPart = dbId ? dbId.toString() : 'all';
    const startPart = startDate ? startDate.getTime().toString() : 'default';
    const endPart = endDate ? endDate.getTime().toString() : 'default';
    
    return `${metricName}:${interval}:${userPart}:${dbPart}:${startPart}:${endPart}`;
  }

  /**
   * Add trend data to cache
   */
  private static addToCache(key: string, trend: Trend): void {
    this.trendCache.set(key, {
      data: trend,
      timestamp: new Date()
    });
    
    // Clean up old cache entries if cache is getting too large
    if (this.trendCache.size > 100) {
      this.cleanExpiredCache();
    }
  }

  /**
   * Get trend data from cache
   */
  private static getFromCache(key: string): Trend | null {
    const cachedItem = this.trendCache.get(key);
    
    if (!cachedItem) {
      return null;
    }
    
    // Check if cache is still valid
    if (Date.now() - cachedItem.timestamp.getTime() > this.CACHE_TTL) {
      this.trendCache.delete(key);
      return null;
    }
    
    return cachedItem.data;
  }

  /**
   * Clean expired cache entries
   */
  private static cleanExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of this.trendCache.entries()) {
      if (now - item.timestamp.getTime() > this.CACHE_TTL) {
        this.trendCache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      trendLogger.debug(`Cleaned ${cleanedCount} expired trend cache entries`);
    }
  }

  /**
   * Clear the entire trend cache
   */
  static clearCache(): void {
    const count = this.trendCache.size;
    this.trendCache.clear();
    trendLogger.info(`Cleared ${count} entries from trend cache`);
  }
  
  /**
   * Set a custom cache TTL (in milliseconds)
   */
  static setCacheTTL(ttlMs: number): void {
    if (ttlMs < 0) {
      trendLogger.warn("Cannot set negative cache TTL, ignoring");
      return;
    }
    
    this.CACHE_TTL = ttlMs;
    trendLogger.info(`Set trend cache TTL to ${ttlMs}ms`);
  }

  /**
   * Create necessary indexes for trend data collections
   */
  static async ensureIndexes(): Promise<boolean> {
    try {
      const client = await getMongoClient();
      
      // We need to ensure indexes on the collections used by trend analysis
      // These are the same collections used by the other services
      
      // For usage_metrics
      await client.db().collection('usage_metrics').createIndex({ timestamp: 1 });
      await client.db().collection('usage_metrics').createIndex({ userId: 1, timestamp: 1 });
      
      // For performance_metrics
      await client.db().collection('performance_metrics').createIndex({ timestamp: 1 });
      await client.db().collection('performance_metrics').createIndex({ userId: 1, timestamp: 1 });
      await client.db().collection('performance_metrics').createIndex({ dbId: 1, timestamp: 1 });
      
      // For security_metrics
      await client.db().collection('security_metrics').createIndex({ timestamp: 1 });
      
      // For error_metrics
      await client.db().collection('error_metrics').createIndex({ timestamp: 1 });
      
      trendLogger.info("Created trend data indexes");
      return true;
    } catch (error) {
      trendLogger.error(`Error creating trend data indexes: ${(error as Error).message}`);
      return false;
    }
  }
}

export default TrendService;