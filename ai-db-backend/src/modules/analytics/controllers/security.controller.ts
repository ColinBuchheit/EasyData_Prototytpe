// src/modules/analytics/controllers/security.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { SecurityService } from "../services/security.service";
import { TrendService } from "../services/trend.service";
import { SecurityEventType } from "../models/metric.model";
import { TimeInterval } from "../models/trend.model";

const securityLogger = createContextLogger("SecurityController");

/**
 * Get security events by type
 */
export const getSecurityEventsByType = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  const eventsByType = await SecurityService.getSecurityEventsByType(startDate, endDate);

  res.json({
    success: true,
    data: eventsByType
  });
});

/**
 * Get security events by severity
 */
export const getSecurityEventsBySeverity = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  const eventsBySeverity = await SecurityService.getSecurityEventsBySeverity(startDate, endDate);

  res.json({
    success: true,
    data: eventsBySeverity
  });
});

/**
 * Get top sources of security events
 */
export const getTopSources = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  const topSources = await SecurityService.getTopSources(limit, startDate, endDate);

  res.json({
    success: true,
    data: topSources
  });
});

/**
 * Get security events trend
 */
export const getSecurityEventsTrend = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  // Parse parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const interval = (req.query.interval as TimeInterval) || 'daily';

  const trend = await TrendService.getTrend({
    metricName: 'securityEvents',
    interval,
    startDate,
    endDate
  });

  res.json({
    success: true,
    data: trend
  });
});

/**
 * Get comprehensive security report
 */
export const getSecurityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  const report = await SecurityService.getSecurityReport(startDate, endDate);

  res.json({
    success: true,
    data: report
  });
});

/**
 * Resolve a security event
 */
export const resolveSecurityEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
    }
  
    // Admin only endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
    }
  
    const { eventId, resolution } = req.body;
  
    if (!eventId) {
      return res.status(400).json({ success: false, message: "Event ID is required" });
    }
  
    const success = await SecurityService.resolveSecurityEvent(eventId, resolution);
  
    if (!success) {
      return res.status(404).json({ success: false, message: "Security event not found" });
    }
  
    res.json({
      success: true,
      message: "Security event resolved successfully"
    });
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
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
  
    // Only internal services or admins can call this endpoint
    if (!isInternalRequest && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Forbidden: Internal API access only" });
    }
  
    const { eventType, severity, description, userId, sourceIp, details } = req.body;
  
    if (!eventType || !severity || !description) {
      return res.status(400).json({ 
        success: false, 
        message: "Event type, severity, and description are required" 
      });
    }
  
    await SecurityService.trackSecurityEvent(
      eventType as SecurityEventType,
      severity,
      description,
      {
        userId: userId || (req.user?.id || undefined),
        sourceIp,
        ...details
      }
    );
  
    res.json({
      success: true,
      message: "Security event tracked successfully"
    });
  });