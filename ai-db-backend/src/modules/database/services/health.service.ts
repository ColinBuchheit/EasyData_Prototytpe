// src/modules/database/services/health.service.ts

import { createContextLogger } from "../../../config/logger";
import { getClientForDB } from "./clients/adapter";
import { HealthCheckResult } from "./clients/interfaces";
import { getRedisClient } from "../../../config/redis";
import { UserDatabase } from "../models/connection.model";

const healthLogger = createContextLogger("DatabaseHealth");

export interface DatabaseHealthStatus {
  id: number;
  dbName: string;
  dbType: string;
  isHealthy: boolean;
  latencyMs: number;
  message: string;
  lastChecked: Date;
}

/**
 * Service for monitoring and managing database connection health
 */
export class DatabaseHealthService {
  /**
   * Check health for a specific database connection
   */
  static async checkDatabaseHealth(db: UserDatabase): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const client = getClientForDB(db.db_type);
      
      // Use client's health check if available
      if (client.checkHealth) {
        return await client.checkHealth(db);
      }
      
      // Fallback health check - just test connection
      const isConnected = await client.testConnection(db);
      const endTime = Date.now();
      
      return {
        isHealthy: isConnected,
        latencyMs: endTime - startTime,
        message: isConnected ? 
          `Connection successful to ${db.connection_name || db.database_name}` : 
          `Failed to connect to ${db.connection_name || db.database_name}`,
        timestamp: new Date()
      };
    } catch (error: unknown) {
      const endTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      healthLogger.error(`Health check failed for ${db.db_type} database ${db.id}: ${errorMessage}`);
      
      return {
        isHealthy: false,
        latencyMs: endTime - startTime,
        message: `Error: ${errorMessage}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Store health check result in Redis cache
   */
  static async storeHealthStatus(db: UserDatabase, result: HealthCheckResult): Promise<void> {
    try {
      const redisClient = await getRedisClient();
      
      const status: DatabaseHealthStatus = {
        id: db.id,
        dbName: db.database_name,
        dbType: db.db_type,
        isHealthy: result.isHealthy,
        latencyMs: result.latencyMs,
        message: result.message,
        lastChecked: result.timestamp
      };
      
      // Store in Redis with 5 minute expiry
      await redisClient.set(
        `db:health:${db.id}`,
        JSON.stringify(status),
        "EX",
        300 // 5 minutes
      );
      
      // Also store in a sorted set for quick access to all health statuses
      await redisClient.zAdd("db:health:all", {
        score: result.isHealthy ? 1 : 0,
        value: String(db.id)
      });
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      healthLogger.error(`Failed to store health status: ${errorMessage}`);
      // Non-critical error, so don't throw
    }
  }

  /**
   * Get cached health status for a database
   */
  static async getCachedHealthStatus(dbId: number): Promise<DatabaseHealthStatus | null> {
    try {
      const redisClient = await getRedisClient();
      const cached = await redisClient.get(`db:health:${dbId}`);
      
      if (!cached) {
        return null;
      }
      
      return JSON.parse(cached) as DatabaseHealthStatus;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      healthLogger.error(`Failed to get cached health status: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Get all database health statuses
   */
  static async getAllHealthStatuses(): Promise<DatabaseHealthStatus[]> {
    try {
      const redisClient = await getRedisClient();
      
      // Get all database IDs from sorted set
      const dbIds = await redisClient.zRange("db:health:all", 0, -1);
      
      if (!dbIds || dbIds.length === 0) {
        return [];
      }
      
      // Get health status for each database
      const statuses: DatabaseHealthStatus[] = [];
      
      for (const dbId of dbIds) {
        const cached = await redisClient.get(`db:health:${dbId}`);
        if (cached) {
          statuses.push(JSON.parse(cached) as DatabaseHealthStatus);
        }
      }
      
      return statuses;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      healthLogger.error(`Failed to get all health statuses: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Run health check and store result
   */
  static async runAndStoreHealthCheck(db: UserDatabase): Promise<HealthCheckResult> {
    const result = await this.checkDatabaseHealth(db);
    await this.storeHealthStatus(db, result);
    return result;
  }

  /**
   * Get unhealthy database connections
   */
  static async getUnhealthyDatabases(): Promise<DatabaseHealthStatus[]> {
    try {
      const redisClient = await getRedisClient();
      
      // Get all unhealthy database IDs from sorted set (score 0)
      const dbIds = await redisClient.zRangeByScore("db:health:all", 0, 0);
      
      if (!dbIds || dbIds.length === 0) {
        return [];
      }
      
      // Get health status for each unhealthy database
      const statuses: DatabaseHealthStatus[] = [];
      
      for (const dbId of dbIds) {
        const cached = await redisClient.get(`db:health:${dbId}`);
        if (cached) {
          statuses.push(JSON.parse(cached) as DatabaseHealthStatus);
        }
      }
      
      return statuses;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      healthLogger.error(`Failed to get unhealthy databases: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Check if a database is healthy (with optional force refresh)
   */
  static async isDatabaseHealthy(db: UserDatabase, forceCheck = false): Promise<boolean> {
    // First check cache
    if (!forceCheck) {
      const cached = await this.getCachedHealthStatus(db.id);
      if (cached) {
        return cached.isHealthy;
      }
    }
    
    // Run health check
    const result = await this.runAndStoreHealthCheck(db);
    return result.isHealthy;
  }
}

export default DatabaseHealthService;