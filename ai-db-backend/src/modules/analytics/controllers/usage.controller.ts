// src/modules/analytics/controllers/usage.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { UsageService } from "../services/usage.service";
import { TrendService } from "../services/trend.service";
import { TimeInterval } from "../models/trend.model";
import { ApiResponse, createSuccessResponse, createErrorResponse } from "../../../shared/models/response.model";

const usageLogger = createContextLogger("UsageController");

/**
 * Get active users statistics
 */
export const getActiveUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json(createErrorResponse("Forbidden: Admin access required", 403));
  }

  try {
    const activeUsers = {
      daily: await UsageService.getActiveUsers('daily'),
      weekly: await UsageService.getActiveUsers('weekly'),
      monthly: await UsageService.getActiveUsers('monthly')
    };

    res.json(createSuccessResponse(activeUsers));
  } catch (error) {
    usageLogger.error(`Error fetching active users: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to fetch active users: ${(error as Error).message}`, 500));
  }
});

/**
 * Get total queries statistics
 */
export const getTotalQueries = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Parse date range from query parameters
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  try {
    // Validate start date
    if (req.query.startDate) {
      const parsedStartDate = new Date(req.query.startDate as string);
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json(createErrorResponse("Invalid startDate format", 400));
      }
      startDate = parsedStartDate;
    }

    // Validate end date
    if (req.query.endDate) {
      const parsedEndDate = new Date(req.query.endDate as string);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json(createErrorResponse("Invalid endDate format", 400));
      }
      endDate = parsedEndDate;
    }

    // Ensure start date is before end date
    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json(createErrorResponse("startDate must be before endDate", 400));
    }

    const totalQueries = await UsageService.getTotalQueries(startDate, endDate);

    res.json(createSuccessResponse({ totalQueries }));
  } catch (error) {
    usageLogger.error(`Error getting total queries: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get total queries: ${(error as Error).message}`, 500));
  }
});

/**
 * Get user query activity
 */
export const getUserQueryActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  try {
    // Admin can view any user's activity, users can only view their own
    const targetUserId = req.query.userId ? Number(req.query.userId) : req.user.id;

    if (req.user.role !== 'admin' && targetUserId !== req.user.id) {
      return res.status(403).json(createErrorResponse("Forbidden: You can only view your own activity", 403));
    }

    // Validate parameter formats
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (req.query.startDate) {
      const parsedStartDate = new Date(req.query.startDate as string);
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json(createErrorResponse("Invalid startDate format", 400));
      }
      startDate = parsedStartDate;
    }

    if (req.query.endDate) {
      const parsedEndDate = new Date(req.query.endDate as string);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json(createErrorResponse("Invalid endDate format", 400));
      }
      endDate = parsedEndDate;
    }

    const interval = req.query.interval as TimeInterval || 'daily';
    
    // Validate the interval is a valid TimeInterval
    const validIntervals: TimeInterval[] = ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json(createErrorResponse(`Invalid interval. Must be one of: ${validIntervals.join(', ')}`, 400));
    }

    const trend = await TrendService.getTrend({
      metricName: 'queryCount',
      interval,
      startDate,
      endDate,
      userId: targetUserId
    });

    if (!trend) {
      return res.status(404).json(createErrorResponse("No activity data found for the specified period", 404));
    }

    res.json(createSuccessResponse(trend));
  } catch (error) {
    usageLogger.error(`Error getting user query activity: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get user query activity: ${(error as Error).message}`, 500));
  }
});

/**
 * Get most used databases
 */
export const getMostUsedDatabases = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  try {
    // Parse and validate parameters
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    let limit: number = 10;

    if (req.query.startDate) {
      const parsedStartDate = new Date(req.query.startDate as string);
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json(createErrorResponse("Invalid startDate format", 400));
      }
      startDate = parsedStartDate;
    }

    if (req.query.endDate) {
      const parsedEndDate = new Date(req.query.endDate as string);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json(createErrorResponse("Invalid endDate format", 400));
      }
      endDate = parsedEndDate;
    }

    if (req.query.limit) {
      limit = parseInt(req.query.limit as string, 10);
      if (isNaN(limit) || limit <= 0) {
        return res.status(400).json(createErrorResponse("Limit must be a positive number", 400));
      }
    }

    const databases = await UsageService.getMostUsedDatabases(limit, startDate, endDate);

    // Filter results if not admin - safely access user.id
    const filteredDatabases = req.user.role === 'admin' 
      ? databases 
      : databases.filter(db => db.userId === req.user!.id);

    res.json(createSuccessResponse(filteredDatabases));
  } catch (error) {
    usageLogger.error(`Error getting most used databases: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get most used databases: ${(error as Error).message}`, 500));
  }
});

/**
 * Get comprehensive usage report
 */
export const getUsageReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }
  
  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json(createErrorResponse("Forbidden: Admin access required", 403));
  }

  try {
    // Parse and validate date parameters
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (req.query.startDate) {
      const parsedStartDate = new Date(req.query.startDate as string);
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json(createErrorResponse("Invalid startDate format", 400));
      }
      startDate = parsedStartDate;
    }

    if (req.query.endDate) {
      const parsedEndDate = new Date(req.query.endDate as string);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json(createErrorResponse("Invalid endDate format", 400));
      }
      endDate = parsedEndDate;
    }

    // Retrieve report with appropriate date filtering
    const report = await UsageService.getUsageReport(startDate, endDate);

    // Add generated timestamp if not already present
    if (!report.generatedAt) {
      report.generatedAt = new Date();
    }

    res.json(createSuccessResponse(report));
  } catch (error) {
    usageLogger.error(`Error generating usage report: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to generate usage report: ${(error as Error).message}`, 500));
  }
});

/**
 * Track user action
 * This is typically called internally, not directly from routes
 */
export const trackUserAction = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }
  
  // Only internal services or admins can call this endpoint
  const isInternalRequest = req.headers['x-internal-request'] === process.env.INTERNAL_API_KEY;
  if (!isInternalRequest && req.user.role !== 'admin') {
    return res.status(403).json(createErrorResponse("Forbidden: Internal API access only", 403));
  }

  try {
    const { action, resourceId, resourceType, details } = req.body;
    
    if (!action) {
      return res.status(400).json(createErrorResponse("Action is required", 400));
    }

    // Validate action is a valid UserAction
    const validActions = [
      'login', 'logout', 'register', 'password_change', 'create_connection', 
      'update_connection', 'delete_connection', 'execute_query', 'ai_query', 
      'multi_db_query', 'view_dashboard', 'export_data'
    ];
    
    if (!validActions.includes(action)) {
      return res.status(400).json(createErrorResponse(`Invalid action. Must be one of: ${validActions.join(', ')}`, 400));
    }

    // We're already checking for req.user above, so we know it's defined here
    const userId = req.user.id;
    
    const success = await UsageService.trackUserAction(userId, action, { 
      resourceId, 
      resourceType, 
      ...details 
    });

    if (!success) {
      return res.status(500).json(createErrorResponse("Failed to track user action", 500));
    }

    res.json(createSuccessResponse({ tracked: true }, "User action tracked successfully"));
  } catch (error) {
    usageLogger.error(`Error tracking user action: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to track user action: ${(error as Error).message}`, 500));
  }
});