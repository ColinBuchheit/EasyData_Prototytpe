// src/modules/database/controllers/health.controller.ts

import { Request, Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { ConnectionsService } from "../services/connections.service";
import DatabaseHealthService from "../services/health.service";

const healthLogger = createContextLogger("HealthController");

/**
 * Check health for a specific database connection
 */
export const checkConnectionHealth = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const dbId = Number(req.params.id);

  if (isNaN(dbId)) {
    return res.status(400).json({ success: false, message: "Invalid database ID." });
  }

  // Get the database connection
  const connection = await ConnectionsService.getConnectionById(req.user.id, dbId);
  if (!connection) {
    return res.status(404).json({ success: false, message: "Database connection not found." });
  }

  // Check if there's a cached health status
  const cachedStatus = await DatabaseHealthService.getCachedHealthStatus(dbId);
  
  // If there's a recent health check (less than 2 minutes old), return it
  const isCacheValid = cachedStatus && 
    (new Date().getTime() - new Date(cachedStatus.lastChecked).getTime() < 2 * 60 * 1000);
  
  if (isCacheValid) {
    return res.json({
      success: true,
      status: cachedStatus
    });
  }

  // Run health check
  const result = await DatabaseHealthService.runAndStoreHealthCheck(connection);
  
  return res.json({
    success: true,
    status: {
      id: connection.id,
      dbName: connection.database_name,
      dbType: connection.db_type,
      isHealthy: result.isHealthy,
      latencyMs: result.latencyMs,
      message: result.message,
      lastChecked: result.timestamp
    }
  });
});

/**
 * Check health for all database connections
 */
export const checkAllConnectionsHealth = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Get all user's database connections
  const connections = await ConnectionsService.getUserConnections(req.user.id);
  
  // Check if force refresh is requested
  const forceRefresh = req.query.force === 'true';
  
  const results = [];
  
  // Run health checks
  for (const connection of connections) {
    let status;
    
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      status = await DatabaseHealthService.getCachedHealthStatus(connection.id);
    }
    
    // If not in cache or forcing refresh, run health check
    if (!status || forceRefresh) {
      const result = await DatabaseHealthService.runAndStoreHealthCheck(connection);
      status = {
        id: connection.id,
        dbName: connection.database_name,
        dbType: connection.db_type,
        isHealthy: result.isHealthy,
        latencyMs: result.latencyMs,
        message: result.message,
        lastChecked: result.timestamp
      };
    }
    
    results.push(status);
  }
  
  return res.json({
    success: true,
    healthStatuses: results
  });
});

/**
 * Get all unhealthy database connections
 */
export const getUnhealthyConnections = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const unhealthyDatabases = await DatabaseHealthService.getUnhealthyDatabases();
  
  // Filter to only show user's connections (for non-admin users)
  const userUnhealthyConnections = [];
  
  for (const db of unhealthyDatabases) {
    // Admin can see all
    if (req.user.role === 'admin') {
      userUnhealthyConnections.push(db);
      continue;
    }
    
    // Regular users only see their own
    try {
      const conn = await ConnectionsService.getConnectionById(req.user.id, db.id);
      if (conn) {
        userUnhealthyConnections.push(db);
      }
    } catch (error) {
      // Ignore errors - just don't include this connection
    }
  }
  
  return res.json({
    success: true,
    unhealthyConnections: userUnhealthyConnections
  });
});

/**
 * Run scheduled health checks for all databases
 * (Admin only endpoint, typically called by a cron job)
 */
export const runScheduledHealthCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  // For admin, get all connections from all users
  // This would require a method to get all connections from all users
  // For now, we'll implement a workaround by getting connections for the admin user
  const connections = await ConnectionsService.getUserConnections(req.user.id);
  
  const results = {
    total: connections.length,
    healthy: 0,
    unhealthy: 0,
    error: 0
  };
  
  // Run health checks for all connections
  for (const connection of connections) {
    try {
      const result = await DatabaseHealthService.runAndStoreHealthCheck(connection);
      if (result.isHealthy) {
        results.healthy++;
      } else {
        results.unhealthy++;
      }
    } catch (error) {
      results.error++;
      healthLogger.error(`Failed to check health for database ${connection.id}: ${error}`);
    }
  }
  
  return res.json({
    success: true,
    results
  });
});