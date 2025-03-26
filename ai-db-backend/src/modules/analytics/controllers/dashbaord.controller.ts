// src/modules/analytics/controllers/dashboard.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { UsageService } from "../services/usage.service";
import { PerformanceService } from "../services/performance.service";
import { SecurityService } from "../services/security.service";
import { TrendService } from "../services/trend.service";

const dashboardLogger = createContextLogger("DashboardController");

/**
 * Get admin dashboard data
 */
export const getAdminDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  try {
    // Calculate date ranges
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(now.getDate() - 30);

    // Get all required metrics
    const [
      activeUsers,
      totalQueries,
      avgQueryTime,
      unresolvedSecurityEvents,
      queryTrend,
      securityTrend
    ] = await Promise.all([
      UsageService.getActiveUsers('monthly'),
      UsageService.getTotalQueries(last30Days),
      PerformanceService.getAverageQueryTime(last30Days),
      SecurityService.getUnresolvedCount(),
      TrendService.getTrend({
        metricName: 'queryCount',
        interval: 'daily',
        startDate: last30Days,
        endDate: now
      }),
      TrendService.getTrend({
        metricName: 'securityEvents',
        interval: 'daily',
        startDate: last30Days,
        endDate: now
      })
    ]);

    res.json({
      success: true,
      data: {
        kpis: {
          activeUsers,
          totalQueries,
          avgQueryTime,
          unresolvedSecurityEvents
        },
        charts: {
          queryTrend,
          securityTrend
        }
      }
    });
  } catch (error) {
    dashboardLogger.error(`Error generating admin dashboard: ${(error as Error).message}`);
    res.status(500).json({
      success: false,
      message: "Failed to generate dashboard data"
    });
  }
});

/**
 * Get user dashboard data
 */
export const getUserDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  try {
    // Calculate date ranges
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(now.getDate() - 30);

    // Get all required metrics
    const [
      userQueries,
      mostUsedDatabases,
      queryTimeTrend
    ] = await Promise.all([
      UsageService.getQueriesPerUser(1, last30Days),
      UsageService.getMostUsedDatabases(5, last30Days),
      TrendService.getTrend({
        metricName: 'executionTime',
        interval: 'daily',
        startDate: last30Days,
        endDate: now,
        userId: req.user.id
      })
    ]);

    // Extract current user's query count
    const queryCount = userQueries.find(q => q.userId === req.user.id)?.queryCount || 0;

    // Filter database usage to only user's databases
    const filteredDatabases = mostUsedDatabases.filter(db => db.userId === req.user.id);

    res.json({
      success: true,
      data: {
        stats: {
          queryCount,
          databasesUsed: filteredDatabases.length
        },
        charts: {
          queryTimeTrend,
          databaseUsage: filteredDatabases
        }
      }
    });
  } catch (error) {
    dashboardLogger.error(`Error generating user dashboard: ${(error as Error).message}`);
    res.status(500).json({
      success: false,
      message: "Failed to generate dashboard data"
    });
  }
});

/**
 * Compare metrics with previous period
 */
export const compareMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin only endpoint for global metrics, regular users can only compare their own
  const isAdminRequest = req.user.role === 'admin' && !req.query.userId;
  
  if (!isAdminRequest && req.query.userId && Number(req.query.userId) !== req.user.id) {
    return res.status(403).json({ success: false, message: "Forbidden: You can only view your own metrics" });
  }

  // Parse query parameters
  const metricName = req.query.metric as string;
  const interval = (req.query.interval as TimeInterval) || 'daily';
  const userId = req.query.userId ? Number(req.query.userId) : (isAdminRequest ? undefined : req.user.id);
  const dbId = req.query.dbId ? Number(req.query.dbId) : undefined;
  
  // Calculate current and previous periods
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
  let startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(endDate);
  
  // Default to last 30 days if no start date provided
  if (!req.query.startDate) {
    startDate.setDate(endDate.getDate() - 30);
  }
  
  const comparison = await TrendService.compareTrends(
    metricName,
    interval,
    startDate,
    endDate,
    userId,
    dbId
  );
  
  if (!comparison) {
    return res.status(400).json({
      success: false,
      message: "Failed to compare metrics. Check your parameters."
    });
  }
  
  res.json({
    success: true,
    data: comparison
  });
});