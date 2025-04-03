// src/modules/analytics/services/security.service.ts

import { getMongoClient } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { SecurityMetric, SecurityEventType, SecurityMetricImpl } from "../models/metric.model";
import { SecurityReport } from "../models/report.model";

const securityLogger = createContextLogger("SecurityAnalytics");

export class SecurityService {
  /**
   * Track security event
   */
  static async trackSecurityEvent(
    eventType: SecurityEventType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    details?: {
      userId?: number;
      sourceIp?: string;
      [key: string]: any;
    }
  ): Promise<boolean> {
    try {
      const client = await getMongoClient();
      
      const metric: SecurityMetric = {
        eventType,
        severity,
        description,
        timestamp: new Date(),
        userId: details?.userId,
        sourceIp: details?.sourceIp,
        resolved: false,
        details
      };
      
      // Use the class implementation for validation
      const securityMetric = new SecurityMetricImpl(metric);
      
      if (!securityMetric.validate()) {
        securityLogger.warn(`Invalid security event data: ${JSON.stringify(metric)}`);
        return false;
      }
      
      await client.db().collection('security_metrics').insertOne(securityMetric.toJSON());
      
      // Log critical and high severity events
      if (severity === 'critical' || severity === 'high') {
        securityLogger.error(`Security event: ${eventType} - ${description} (${severity})`);
        
        // Trigger notification for critical events
        this.notifyCriticalEvent(securityMetric.toJSON());
      } else {
        securityLogger.warn(`Security event: ${eventType} - ${description} (${severity})`);
      }
      
      return true;
    } catch (error) {
      securityLogger.error(`Error tracking security event: ${(error as Error).message}`);
      // Still log the security event even if we couldn't store it
      securityLogger.error(`Failed to record security event: ${eventType} - ${description} (${severity})`);
      return false;
    }
  }

  /**
   * Notify about critical security events
   */
  static async notifyCriticalEvent(event: SecurityMetric): Promise<void> {
    try {
      const client = await getMongoClient();
      
      // Store notification
      await client.db().collection('security_notifications').insertOne({
        event,
        notified: false,
        notificationTime: new Date(),
        attempts: 0,
        maxAttempts: 3
      });
      
      // Add any external notification logic here (like sending to admin notification queue)
      
      securityLogger.info(`Critical security event notification created: ${event.eventType} - ${event.description}`);
    } catch (error) {
      securityLogger.error(`Failed to create notification for critical event: ${(error as Error).message}`);
    }
  }

  /**
   * Mark security event as resolved
   */
  static async resolveSecurityEvent(eventId: string, resolution?: string): Promise<boolean> {
    try {
      const client = await getMongoClient();
      const { ObjectId } = require('mongodb');
      
      const result = await client.db().collection('security_metrics').updateOne(
        { _id: new ObjectId(eventId) },
        { 
          $set: { 
            resolved: true, 
            resolutionDate: new Date(),
            resolutionDetails: resolution 
          } 
        }
      );
      
      const success = result.modifiedCount > 0;
      
      if (success) {
        securityLogger.info(`Security event ${eventId} marked as resolved`);
        
        // Update any pending notifications
        await client.db().collection('security_notifications').updateOne(
          { 'event._id': new ObjectId(eventId) },
          { $set: { resolved: true, resolvedAt: new Date() } }
        );
      } else {
        securityLogger.warn(`Failed to resolve security event ${eventId}: Event not found`);
      }
      
      return success;
    } catch (error) {
      securityLogger.error(`Error resolving security event: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Get security events by type
   */
  static async getSecurityEventsByType(startDate?: Date, endDate?: Date): Promise<{ type: string; count: number }[]> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {};
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      const result = await client.db().collection('security_metrics')
        .aggregate([
          {
            $match: matchStage
          },
          {
            $group: {
              _id: "$eventType",
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              type: "$_id",
              count: 1,
              _id: 0
            }
          },
          {
            $sort: { count: -1 }
          }
        ])
        .toArray();
      
      // Cast the result to the expected type
      return result as { type: string; count: number }[];
    } catch (error) {
      securityLogger.error(`Error getting security events by type: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get security events by severity
   */
  static async getSecurityEventsBySeverity(startDate?: Date, endDate?: Date): Promise<{ severity: string; count: number }[]> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {};
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      const result = await client.db().collection('security_metrics')
        .aggregate([
          {
            $match: matchStage
          },
          {
            $group: {
              _id: "$severity",
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              severity: "$_id",
              count: 1,
              _id: 0
            }
          },
          {
            $sort: { 
              severity: -1 // Sort by severity (critical > high > medium > low)
            }
          }
        ])
        .toArray();
      
      // Cast the MongoDB result to our expected type
      const typedResult = result as { severity: string; count: number }[];
      
      // Sort in the correct order (critical, high, medium, low)
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      typedResult.sort((a, b) => {
        const severityA = a.severity as keyof typeof severityOrder;
        const severityB = b.severity as keyof typeof severityOrder;
        return severityOrder[severityB] - severityOrder[severityA];
      });
      
      return typedResult;
    } catch (error) {
      securityLogger.error(`Error getting security events by severity: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get top sources of security events
   */
  static async getTopSources(limit = 10, startDate?: Date, endDate?: Date): Promise<{ sourceIp: string; count: number }[]> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {
        sourceIp: { $exists: true, $ne: null }
      };
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      const result = await client.db().collection('security_metrics')
        .aggregate([
          {
            $match: matchStage
          },
          {
            $group: {
              _id: "$sourceIp",
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              sourceIp: "$_id",
              count: 1,
              _id: 0
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $limit: limit
          }
        ])
        .toArray();
      
      // Cast the result to the expected type
      return result as { sourceIp: string; count: number }[];
    } catch (error) {
      securityLogger.error(`Error getting top security event sources: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get unresolved security events count
   */
  static async getUnresolvedCount(startDate?: Date, endDate?: Date): Promise<number> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {
        resolved: false
      };
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      const count = await client.db().collection('security_metrics')
        .countDocuments(matchStage);
      
      return count;
    } catch (error) {
      securityLogger.error(`Error getting unresolved security events count: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Get unresolved critical events that require immediate attention
   */
  static async getUnresolvedCriticalEvents(): Promise<SecurityMetric[]> {
    try {
      const client = await getMongoClient();
      
      const events = await client.db().collection('security_metrics')
        .find({
          resolved: false,
          severity: { $in: ['critical', 'high'] }
        })
        .sort({ timestamp: -1 })
        .toArray();
      
      // Cast the MongoDB result to SecurityMetric[]
      return events as unknown as SecurityMetric[];
    } catch (error) {
      securityLogger.error(`Error getting unresolved critical events: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get security report
   */
  static async getSecurityReport(startDate?: Date, endDate?: Date): Promise<SecurityReport> {
    try {
      const [
        totalEvents,
        eventsByType,
        eventsBySeverity,
        topSources,
        unresolvedEvents
      ] = await Promise.all([
        this.getTotalEvents(startDate, endDate),
        this.getSecurityEventsByType(startDate, endDate),
        this.getSecurityEventsBySeverity(startDate, endDate),
        this.getTopSources(10, startDate, endDate),
        this.getUnresolvedCount(startDate, endDate)
      ]);
      
      return {
        totalEvents,
        eventsByType,
        eventsBySeverity,
        topSources,
        unresolvedEvents,
        generatedAt: new Date()
      };
    } catch (error) {
      securityLogger.error(`Error generating security report: ${(error as Error).message}`);
      
      // Return empty report on error
      return {
        totalEvents: 0,
        eventsByType: [],
        eventsBySeverity: [],
        topSources: [],
        unresolvedEvents: 0,
        generatedAt: new Date()
      };
    }
  }

  /**
   * Get total security events count
   */
  private static async getTotalEvents(startDate?: Date, endDate?: Date): Promise<number> {
    try {
      const client = await getMongoClient();
      const matchStage: any = {};
      
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = startDate;
        if (endDate) matchStage.timestamp.$lte = endDate;
      }
      
      const count = await client.db().collection('security_metrics')
        .countDocuments(matchStage);
      
      return count;
    } catch (error) {
      securityLogger.error(`Error getting total security events: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Create necessary indexes for security metrics
   */
  static async ensureIndexes(): Promise<boolean> {
    try {
      const client = await getMongoClient();
      
      // Create indexes for security_metrics collection
      await client.db().collection('security_metrics').createIndex({ eventType: 1 });
      await client.db().collection('security_metrics').createIndex({ severity: 1 });
      await client.db().collection('security_metrics').createIndex({ timestamp: 1 });
      await client.db().collection('security_metrics').createIndex({ userId: 1 });
      await client.db().collection('security_metrics').createIndex({ sourceIp: 1 });
      await client.db().collection('security_metrics').createIndex({ resolved: 1 });
      
      // Compound indexes for common queries
      await client.db().collection('security_metrics').createIndex({ resolved: 1, severity: 1 });
      await client.db().collection('security_metrics').createIndex({ eventType: 1, timestamp: 1 });
      
      // Create indexes for security_notifications collection
      await client.db().collection('security_notifications').createIndex({ notified: 1 });
      await client.db().collection('security_notifications').createIndex({ 'event._id': 1 });
      
      securityLogger.info("Created security metrics indexes");
      return true;
    } catch (error) {
      securityLogger.error(`Error creating security metrics indexes: ${(error as Error).message}`);
      return false;
    }
  }
}

export default SecurityService;