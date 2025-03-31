// src/modules/analytics/controllers/performance.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { PerformanceService } from "../services/performance.service";
import { TrendService } from "../services/trend.service";
import { TimeInterval } from "../models/trend.model";
import { ApiResponse, createSuccessResponse, createErrorResponse } from "../../../shared/models/response.model";

const perfLogger = createContextLogger("PerformanceController");

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
 * Get average query execution time
 */
export const getAverageQueryTime = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  try {
    // Parse date range from query parameters
    const { startDate, endDate, error } = validateDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    if (error) {
      return res.status(400).json(createErrorResponse(error, 400));
    }

    // Validate dbId if provided
    let dbId: number | undefined;
    if (req.query.dbId) {
      dbId = Number(req.query.dbId);
      if (isNaN(dbId)) {
        return res.status(400).json(createErrorResponse("Invalid dbId format", 400));
      }
    }

    const averageTime = await PerformanceService.getAverageQueryTime(startDate, endDate, dbId);

    res.json(createSuccessResponse({ averageTime }));
  } catch (error) {
    perfLogger.error(`Error getting average query time: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get average query time: ${(error as Error).message}`, 500));
  }
});

/**
 * Get slowest queries
 */
export const getSlowestQueries = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Store user properties to avoid TypeScript issues
  const userRole = req.user.role;

  // Admin only endpoint
  if (userRole !== 'admin') {
    return res.status(403).json(createErrorResponse("Forbidden: Admin access required", 403));
  }

  try {
    // Parse date range from query parameters
    const { startDate, endDate, error } = validateDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    if (error) {
      return res.status(400).json(createErrorResponse(error, 400));
    }

    // Parse pagination parameters
    let limit = 10;
    let page = 1;

    if (req.query.limit) {
      limit = Number(req.query.limit);
      if (isNaN(limit) || limit <= 0) {
        return res.status(400).json(createErrorResponse("Limit must be a positive number", 400));
      }
    }

    if (req.query.page) {
      page = Number(req.query.page);
      if (isNaN(page) || page <= 0) {
        return res.status(400).json(createErrorResponse("Page must be a positive number", 400));
      }
    }

    // Get queries with pagination
    const result = await PerformanceService.getSlowestQueries(limit, page, startDate, endDate);

    res.json(createSuccessResponse({
      data: result.data,
      pagination: {
        total: result.total,
        page,
        limit,
        pages: result.pages
      }
    }));
  } catch (error) {
    perfLogger.error(`Error getting slowest queries: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get slowest queries: ${(error as Error).message}`, 500));
  }
});

/**
 * Get database performance metrics
 */
export const getDatabasePerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Store user properties to avoid TypeScript issues
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Parse date range from query parameters
    const { startDate, endDate, error } = validateDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    if (error) {
      return res.status(400).json(createErrorResponse(error, 400));
    }

    const databasePerformance = await PerformanceService.getDatabasePerformance(startDate, endDate);

    // If not admin, filter to only show user's databases
    const filteredPerformance = userRole === 'admin'
      ? databasePerformance
      : databasePerformance.filter(db => db.userId === userId);

    res.json(createSuccessResponse(filteredPerformance));
  } catch (error) {
    perfLogger.error(`Error getting database performance: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get database performance: ${(error as Error).message}`, 500));
  }
});

/**
 * Get execution time trend
 */
export const getExecutionTimeTrend = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Store user properties to avoid TypeScript issues
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Parse parameters
    let dbId: number | undefined;
    if (req.query.dbId) {
      dbId = Number(req.query.dbId);
      if (isNaN(dbId)) {
        return res.status(400).json(createErrorResponse("Invalid dbId format", 400));
      }
    }

    // Parse date range
    const { startDate, endDate, error } = validateDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    if (error) {
      return res.status(400).json(createErrorResponse(error, 400));
    }

    // Validate interval
    const interval = (req.query.interval as TimeInterval) || 'daily';
    const validIntervals: TimeInterval[] = ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json(createErrorResponse(`Invalid interval. Must be one of: ${validIntervals.join(', ')}`, 400));
    }

    // If requesting specific dbId, verify user has access
    if (dbId && userRole !== 'admin') {
      // This would typically query the database to check if the user owns this database
      // For now, assuming access control is done elsewhere
    }

    const trend = await TrendService.getTrend({
      metricName: 'executionTime',
      interval,
      startDate,
      endDate,
      dbId,
      userId: userRole === 'admin' ? undefined : userId
    });

    if (!trend) {
      return res.status(404).json(createErrorResponse("No trend data found for the specified criteria", 404));
    }

    res.json(createSuccessResponse(trend));
  } catch (error) {
    perfLogger.error(`Error getting execution time trend: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get execution time trend: ${(error as Error).message}`, 500));
  }
});

/**
 * Get AI response times
 */
export const getAIResponseTimes = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  try {
    // Parse date range
    const { startDate, endDate, error } = validateDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    if (error) {
      return res.status(400).json(createErrorResponse(error, 400));
    }

    const aiResponseTimes = await PerformanceService.getAIResponseTimes(startDate, endDate);

    res.json(createSuccessResponse(aiResponseTimes));
  } catch (error) {
    perfLogger.error(`Error getting AI response times: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get AI response times: ${(error as Error).message}`, 500));
  }
});

/**
 * Get comprehensive performance report
 */
export const getPerformanceReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Store user properties to avoid TypeScript issues
  const userRole = req.user.role;

  // Admin only endpoint
  if (userRole !== 'admin') {
    return res.status(403).json(createErrorResponse("Forbidden: Admin access required", 403));
  }

  try {
    // Parse date range
    const { startDate, endDate, error } = validateDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    if (error) {
      return res.status(400).json(createErrorResponse(error, 400));
    }

    const report = await PerformanceService.getPerformanceReport(startDate, endDate);

    // Ensure the report has a generation timestamp
    if (!report.generatedAt) {
      report.generatedAt = new Date();
    }

    res.json(createSuccessResponse(report));
  } catch (error) {
    perfLogger.error(`Error getting performance report: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get performance report: ${(error as Error).message}`, 500));
  }
});

/**
 * Track query performance
 * This is typically called internally, not directly from routes
 */
export const trackQueryPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Store user properties to avoid TypeScript issues
  const userId = req.user.id;
  const userRole = req.user.role;

  // Only internal services or admins can call this endpoint
  const isInternalRequest = req.headers['x-internal-request'] === process.env.INTERNAL_API_KEY;
  if (!isInternalRequest && userRole !== 'admin') {
    return res.status(403).json(createErrorResponse("Forbidden: Internal API access only", 403));
  }

  try {
    const { executionTimeMs, dbId, queryType, rowCount, success } = req.body;

    if (typeof executionTimeMs !== 'number') {
      return res.status(400).json(createErrorResponse("Execution time is required and must be a number", 400));
    }

    if (executionTimeMs < 0) {
      return res.status(400).json(createErrorResponse("Execution time must be a positive number", 400));
    }

    // Validate dbId if provided
    if (dbId !== undefined) {
      const dbIdNum = Number(dbId);
      if (isNaN(dbIdNum)) {
        return res.status(400).json(createErrorResponse("Invalid dbId format", 400));
      }
    }

    await PerformanceService.trackQueryPerformance({
      userId: userId,
      executionTimeMs,
      dbId,
      queryType,
      rowCount,
      success: !!success,
      timestamp: new Date()
    });

    res.json(createSuccessResponse(null, "Query performance tracked successfully"));
  } catch (error) {
    perfLogger.error(`Error tracking query performance: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to track query performance: ${(error as Error).message}`, 500));
  }
});