// src/modules/analytics/controllers/dashboard.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { UsageService } from "../services/usage.service";
import { PerformanceService } from "../services/performance.service";
import { SecurityService } from "../services/security.service";
import { TrendService } from "../services/trend.service";
import { TimeInterval } from "../models/trend.model";
import { ApiResponse, createSuccessResponse, createErrorResponse } from "../../../shared/models/response.model";

const dashboardLogger = createContextLogger("DashboardController");

/**
 * Validate date range parameters
 */
function validateDateRange(
  startDateStr?: string, 
  endDateStr?: string
): { startDate?: Date; endDate?: Date; error?: string } {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  // Validate start date
  if (startDateStr) {
    const parsedStartDate = new Date(startDateStr);
    if (isNaN(parsedStartDate.getTime())) {
      return { error: "Invalid startDate format" };
    }
    startDate = parsedStartDate;
  }

  // Validate end date
  if (endDateStr) {
    const parsedEndDate = new Date(endDateStr);
    if (isNaN(parsedEndDate.getTime())) {
      return { error: "Invalid endDate format" };
    }
    endDate = parsedEndDate;
  }

  // Ensure start date is before end date
  if (startDate && endDate && startDate > endDate) {
    return { error: "startDate must be before endDate" };
  }

  return { startDate, endDate };
}

/**
 * Get admin dashboard data
 */
export const getAdminDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json(createErrorResponse("Forbidden: Admin access required", 403));
  }

  try {
    // Calculate date ranges
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(now.getDate() - 30);

    // Get all required metrics in parallel
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

    const dashboard = {
      kpis: {
        activeUsers,
        totalQueries,
        avgQueryTime,
        unresolvedSecurityEvents
      },
      charts: {
        queryTrend,
        securityTrend
      },
      generatedAt: new Date()
    };

    res.json(createSuccessResponse(dashboard));
  } catch (error) {
    dashboardLogger.error(`Error generating admin dashboard: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse("Failed to generate dashboard data", 500));
  }
});

/**
 * Get user dashboard data
 */
export const getUserDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  try {
    // Store user values in local variables
    const userId = req.user.id;
    
    // Calculate date ranges
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(now.getDate() - 30);

    // Get all required metrics in parallel
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
        userId: userId
      })
    ]);

    // Extract current user's query count
    const queryCount = userQueries.find(q => q.userId === userId)?.queryCount || 0;

    // Filter database usage to only user's databases
    const filteredDatabases = mostUsedDatabases.filter(db => db.userId === userId);

    const dashboard = {
      stats: {
        queryCount,
        databasesUsed: filteredDatabases.length
      },
      charts: {
        queryTimeTrend,
        databaseUsage: filteredDatabases
      },
      generatedAt: new Date()
    };

    res.json(createSuccessResponse(dashboard));
  } catch (error) {
    dashboardLogger.error(`Error generating user dashboard: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse("Failed to generate dashboard data", 500));
  }
});

/**
 * Compare metrics with previous period
 */
export const compareMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  try {
    // Store user values in local variables to avoid TypeScript errors
    const userRole = req.user.role;
    const userId = req.user.id;
    
    // Admin only endpoint for global metrics, regular users can only compare their own
    const isAdminRequest = userRole === 'admin' && !req.query.userId;
    
    if (!isAdminRequest && req.query.userId && Number(req.query.userId) !== userId) {
      return res.status(403).json(createErrorResponse("Forbidden: You can only view your own metrics", 403));
    }

    // Parse query parameters
    const metricName = req.query.metric as string;
    if (!metricName) {
      return res.status(400).json(createErrorResponse("metric parameter is required", 400));
    }

    // Validate interval
    const interval = (req.query.interval as TimeInterval) || 'daily';
    const validIntervals: TimeInterval[] = ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json(createErrorResponse(`Invalid interval. Must be one of: ${validIntervals.join(', ')}`, 400));
    }

    // Parse user ID
    const targetUserId = req.query.userId ? Number(req.query.userId) : (isAdminRequest ? undefined : userId);
    if (req.query.userId && isNaN(Number(req.query.userId))) {
      return res.status(400).json(createErrorResponse("Invalid userId format", 400));
    }

    // Parse database ID
    let dbId: number | undefined;
    if (req.query.dbId) {
      dbId = Number(req.query.dbId);
      if (isNaN(dbId)) {
        return res.status(400).json(createErrorResponse("Invalid dbId format", 400));
      }
    }
    
    // Parse date ranges
    const { startDate, endDate, error } = validateDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    if (error) {
      return res.status(400).json(createErrorResponse(error, 400));
    }

    // Default to last 30 days if no dates are provided
    const endDateValue = endDate || new Date();
    const startDateValue = startDate || new Date(endDateValue);
    startDateValue.setDate(endDateValue.getDate() - 30);
    
    const comparison = await TrendService.compareTrends(
      metricName,
      interval,
      startDateValue,
      endDateValue,
      targetUserId,
      dbId
    );
    
    if (!comparison) {
      return res.status(400).json(createErrorResponse("Failed to compare metrics. Check your parameters.", 400));
    }
    
    res.json(createSuccessResponse(comparison));
  } catch (error) {
    dashboardLogger.error(`Error comparing metrics: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to compare metrics: ${(error as Error).message}`, 500));
  }
});