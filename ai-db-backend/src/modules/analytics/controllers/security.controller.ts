// src/modules/analytics/controllers/security.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { SecurityService } from "../services/security.service";
import { TrendService } from "../services/trend.service";
import { SecurityEventType } from "../models/metric.model";
import { TimeInterval } from "../models/trend.model";
import { ApiResponse, createSuccessResponse, createErrorResponse } from "../../../shared/models/response.model";

const securityLogger = createContextLogger("SecurityController");

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
 * Get security events by type
 */
export const getSecurityEventsByType = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
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

    const eventsByType = await SecurityService.getSecurityEventsByType(startDate, endDate);

    res.json(createSuccessResponse(eventsByType));
  } catch (error) {
    securityLogger.error(`Error getting security events by type: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get security events by type: ${(error as Error).message}`, 500));
  }
});

/**
 * Get security events by severity
 */
export const getSecurityEventsBySeverity = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
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

    const eventsBySeverity = await SecurityService.getSecurityEventsBySeverity(startDate, endDate);

    res.json(createSuccessResponse(eventsBySeverity));
  } catch (error) {
    securityLogger.error(`Error getting security events by severity: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get security events by severity: ${(error as Error).message}`, 500));
  }
});

/**
 * Get top sources of security events
 */
export const getTopSources = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
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

    // Parse limit parameter
    let limit = 10;
    if (req.query.limit) {
      limit = Number(req.query.limit);
      if (isNaN(limit) || limit <= 0) {
        return res.status(400).json(createErrorResponse("Limit must be a positive number", 400));
      }
    }

    const topSources = await SecurityService.getTopSources(limit, startDate, endDate);

    res.json(createSuccessResponse(topSources));
  } catch (error) {
    securityLogger.error(`Error getting top security event sources: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get top security event sources: ${(error as Error).message}`, 500));
  }
});

/**
 * Get security events trend
 */
export const getSecurityEventsTrend = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }
  
  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json(createErrorResponse("Forbidden: Admin access required", 403));
  }

  try {
    // Parse parameters
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

    const trend = await TrendService.getTrend({
      metricName: 'securityEvents',
      interval,
      startDate,
      endDate
    });

    if (!trend) {
      return res.status(404).json(createErrorResponse("No trend data found for the specified criteria", 404));
    }

    res.json(createSuccessResponse(trend));
  } catch (error) {
    securityLogger.error(`Error getting security events trend: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get security events trend: ${(error as Error).message}`, 500));
  }
});
  
/**
 * Get comprehensive security report
 */
export const getSecurityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
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

    const report = await SecurityService.getSecurityReport(startDate, endDate);

    // Ensure the report has a generation timestamp
    if (!report.generatedAt) {
      report.generatedAt = new Date();
    }

    res.json(createSuccessResponse(report));
  } catch (error) {
    securityLogger.error(`Error getting security report: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to get security report: ${(error as Error).message}`, 500));
  }
});
  
/**
 * Resolve a security event
 */
export const resolveSecurityEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json(createErrorResponse("Unauthorized: User not authenticated", 401));
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json(createErrorResponse("Forbidden: Admin access required", 403));
  }

  try {
    const { eventId, resolution } = req.body;

    if (!eventId) {
      return res.status(400).json(createErrorResponse("Event ID is required", 400));
    }

    // Validate eventId format (assuming MongoDB ObjectId)
    if (!eventId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json(createErrorResponse("Invalid event ID format", 400));
    }

    const success = await SecurityService.resolveSecurityEvent(eventId, resolution);

    if (!success) {
      return res.status(404).json(createErrorResponse("Security event not found", 404));
    }

    res.json(createSuccessResponse(null, "Security event resolved successfully"));
  } catch (error) {
    securityLogger.error(`Error resolving security event: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to resolve security event: ${(error as Error).message}`, 500));
  }
});
  
/**
 * Track security event
 * This is typically called internally, not directly from routes
 */
export const trackSecurityEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Security events can be submitted without authentication for certain scenarios
  // But we should verify it's an internal request
  const isInternalRequest = req.headers['x-internal-request'] === process.env.INTERNAL_API_KEY;
  const isAuthenticated = !!req.user;

  if (!isInternalRequest && !isAuthenticated) {
    return res.status(401).json(createErrorResponse("Unauthorized", 401));
  }

  // Only internal services or admins can call this endpoint
  if (!isInternalRequest && req.user?.role !== 'admin') {
    return res.status(403).json(createErrorResponse("Forbidden: Internal API access only", 403));
  }

  try {
    const { eventType, severity, description, userId, sourceIp, details } = req.body;

    if (!eventType || !severity || !description) {
      return res.status(400).json(createErrorResponse("Event type, severity, and description are required", 400));
    }

    // Validate event type
    const validTypes: SecurityEventType[] = [
      'failed_login', 'suspicious_query', 'unauthorized_access', 'rate_limit_exceeded',
      'token_reuse', 'password_guessing', 'sql_injection_attempt', 'parameter_tampering'
    ];
    if (!validTypes.includes(eventType as SecurityEventType)) {
      return res.status(400).json(createErrorResponse(`Invalid event type. Must be one of: ${validTypes.join(', ')}`, 400));
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json(createErrorResponse(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`, 400));
    }

    await SecurityService.trackSecurityEvent(
      eventType as SecurityEventType,
      severity as any,  // TypeScript limitation with union types
      description,
      {
        userId: userId || (req.user?.id),
        sourceIp,
        ...details
      }
    );

    // If it's a critical event, trigger notifications
    if (severity === 'critical' || severity === 'high') {
      // Implementation for notifyCriticalEvent would be in SecurityService
      // We would call it here if implemented
    }

    res.json(createSuccessResponse(null, "Security event tracked successfully"));
  } catch (error) {
    securityLogger.error(`Error tracking security event: ${(error as Error).message}`);
    res.status(500).json(createErrorResponse(`Failed to track security event: ${(error as Error).message}`, 500));
  }
});