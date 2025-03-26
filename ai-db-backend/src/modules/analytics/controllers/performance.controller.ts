// src/modules/analytics/controllers/performance.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { PerformanceService } from "../services/performance.service";
import { TrendService } from "../services/trend.service";
import { TimeInterval } from "../models/trend.model";

const perfLogger = createContextLogger("PerformanceController");

/**
 * Get average query execution time
 */
export const getAverageQueryTime = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Parse date range from query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const dbId = req.query.dbId ? Number(req.query.dbId) : undefined;

  const averageTime = await PerformanceService.getAverageQueryTime(startDate, endDate, dbId);

  res.json({
    success: true,
    data: { averageTime }
  });
});

/**
 * Get slowest queries
 */
export const getSlowestQueries = asyncHandler(async (req: AuthRequest, res: Response) => {
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
  const limit = req.query.limit ? Number(req.query.limit) : 10;

  const slowestQueries = await PerformanceService.getSlowestQueries(limit, startDate, endDate);

  res.json({
    success: true,
    data: slowestQueries
  });
});

/**
 * Get database performance metrics
 */
export const getDatabasePerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Parse date range from query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const databasePerformance = await PerformanceService.getDatabasePerformance(startDate, endDate);

  // If not admin, filter to only show user's databases
  const filteredPerformance = req.user.role === 'admin'
    ? databasePerformance
    : databasePerformance.filter(db => db.userId === req.user.id);

  res.json({
    success: true,
    data: filteredPerformance
  });
});

/**
 * Get execution time trend
 */
export const getExecutionTimeTrend = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Parse parameters
  const dbId = req.query.dbId ? Number(req.query.dbId) : undefined;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const interval = (req.query.interval as TimeInterval) || 'daily';
  
  // If requesting specific dbId, verify user has access
  if (dbId && req.user.role !== 'admin') {
    // Verify ownership logic would go here
    // This would typically query the database to check if the user owns this database
    // For now, we'll assume the check passes
  }

  const trend = await TrendService.getTrend({
    metricName: 'executionTime',
    interval,
    startDate,
    endDate,
    dbId,
    userId: req.user.role === 'admin' ? undefined : req.user.id
  });

  res.json({
    success: true,
    data: trend
  });
});

/**
 * Get AI response times
 */
export const getAIResponseTimes = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Parse date range from query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const aiResponseTimes = await PerformanceService.getAIResponseTimes(startDate, endDate);

  res.json({
    success: true,
    data: aiResponseTimes
  });
});

/**
 * Get comprehensive performance report
 */
export const getPerformanceReport = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  const report = await PerformanceService.getPerformanceReport(startDate, endDate);

  res.json({
    success: true,
    data: report
  });
});

/**
 * Track query performance
 * This is typically called internally, not directly from routes
 */
export const trackQueryPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Only internal services or admins can call this endpoint
  const isInternalRequest = req.headers['x-internal-request'] === process.env.INTERNAL_API_KEY;
  if (!isInternalRequest && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Internal API access only" });
  }

  const { executionTimeMs, dbId, queryType, rowCount, success } = req.body;

  if (typeof executionTimeMs !== 'number') {
    return res.status(400).json({ success: false, message: "Execution time is required and must be a number" });
  }

  await PerformanceService.trackQueryPerformance({
    userId: req.user.id,
    executionTimeMs,
    dbId,
    queryType,
    rowCount,
    success: !!success,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: "Query performance tracked successfully"
  });
});