// src/modules/analytics/controllers/usage.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { UsageService } from "../services/usage.service";
import { TrendService } from "../services/trend.service";

const usageLogger = createContextLogger("UsageController");

/**
 * Get active users statistics
 */
export const getActiveUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  const activeUsers = {
    daily: await UsageService.getActiveUsers('daily'),
    weekly: await UsageService.getActiveUsers('weekly'),
    monthly: await UsageService.getActiveUsers('monthly')
  };

  res.json({
    success: true,
    data: activeUsers
  });
});

/**
 * Get total queries statistics
 */
export const getTotalQueries = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  // Parse date range from query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const totalQueries = await UsageService.getTotalQueries(startDate, endDate);

  res.json({
    success: true,
    data: { totalQueries }
  });
});

/**
 * Get user query activity
 */
export const getUserQueryActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin can view any user's activity, users can only view their own
  const targetUserId = req.query.userId ? Number(req.query.userId) : req.user.id;

  if (req.user.role !== 'admin' && targetUserId !== req.user.id) {
    return res.status(403).json({ success: false, message: "Forbidden: You can only view your own activity" });
  }

  // Parse date range from query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const interval = (req.query.interval as TimeInterval) || 'daily';

  const trend = await TrendService.getTrend({
    metricName: 'queryCount',
    interval,
    startDate,
    endDate,
    userId: targetUserId
  });

  res.json({
    success: true,
    data: trend
  });
});

/**
 * Get most used databases
 */
export const getMostUsedDatabases = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Parse date range from query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 10;

  // If admin, they can view all databases usage
  // If regular user, filter to only show their databases
  const databases = await UsageService.getMostUsedDatabases(
    limit,
    startDate,
    endDate
  );

  // Filter results if not admin
  const filteredDatabases = req.user.role === 'admin' 
    ? databases 
    : databases.filter(db => db.userId === req.user.id);

  // src/modules/analytics/controllers/usage.controller.ts (continued)
  res.json({
    success: true,
    data: filteredDatabases
  });
});

/**
 * Get comprehensive usage report
 */
export const getUsageReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }
  
  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  // Parse date range from query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const report = await UsageService.getUsageReport(startDate, endDate);

  res.json({
    success: true,
    data: report
  });
});

/**
 * Track user action
 * This is typically called internally, not directly from routes
 */
export const trackUserAction = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }
  
  // Only internal services or admins can call this endpoint
  const isInternalRequest = req.headers['x-internal-request'] === process.env.INTERNAL_API_KEY;
  if (!isInternalRequest && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Internal API access only" });
  }

  const { action, resourceId, resourceType, details } = req.body;
  
  if (!action) {
    return res.status(400).json({ success: false, message: "Action is required" });
  }

  await UsageService.trackUserAction(req.user.id, action, { resourceId, resourceType, ...details });

  res.json({
    success: true,
    message: "User action tracked successfully"
  });
});