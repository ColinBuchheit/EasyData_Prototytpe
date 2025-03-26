// src/modules/analytics/services/security.service.ts

import { getMongoClient } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { SecurityMetric, SecurityEventType } from "../models/metric.model";
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
  ): Promise<void> {
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
      
      await client.db().collection('security_metrics').insertOne(metric);
      
      // Log critical and high severity events
      if (severity === 'critical' || severity === 'high') {
        securityLogger.error(`Security event: ${eventType} - ${description} (${severity})`);
      } else {
        securityLogger.warn(`Security event: ${eventType} - ${description} (${severity})`);
      }
    } catch (error) {
      securityLogger.error(`Error tracking security event: ${(error as Error).message}`);
      // Still log the security event even if we couldn't store it
      securityLogger.error(`Failed to record security event: ${eventType} - ${description} (${severity})`);
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
      
      return result.modifiedCount > 0;
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
      
      return result;
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
      
      return result;
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
      
      return result;
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
        unresolvedEvents
      };
    } catch (error) {
      securityLogger.error(`Error generating security report: ${(error as Error).message}`);
      
      // Return empty report on error
      return {
        totalEvents: 0,
        eventsByType: [],
        eventsBySeverity: [],
        topSources: [],
        unresolvedEvents: 0
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
}

export default SecurityService;