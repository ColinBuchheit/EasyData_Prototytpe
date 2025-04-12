// src/modules/database/services/health.service.ts
import { getMongoClient, pool } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { getRedisClient } from "../../../config/redis";
import { ConnectionsService } from "./connections.service";
import { getClientForDB } from "./clients";
import { UserDatabase } from "../models/connection.model";
import { HealthCheckResult } from "./clients/interfaces";

const healthLogger = createContextLogger("DatabaseHealth");

/**
 * Service for monitoring and reporting database health
 */
export class DatabaseHealthServiceImpl {
  /**
   * Get cached health status for a database
   */
  static async getCachedHealthStatus(dbId: number): Promise<any | null> {
    try {
      // Validate that dbId is a valid integer
      if (!Number.isInteger(dbId)) {
        healthLogger.error(`Invalid database ID parameter in getCachedHealthStatus: dbId=${dbId}`);
        return null;
      }
      
      const redisClient = await getRedisClient();
      const cachedStatus = await redisClient.get(`db:health:${dbId}`);
      
      if (!cachedStatus) {
        return null;
      }
      
      return JSON.parse(cachedStatus);
    } catch (error) {
      healthLogger.error(`Error getting cached health status: ${(error as Error).message}`);
      return null;
    }
  }
  
  /**
   * Run health check for a database and store the result
   */
  static async runAndStoreHealthCheck(db: UserDatabase): Promise<HealthCheckResult> {
    try {
      healthLogger.info(`Running health check for database ${db.id} (${db.db_type})`);
      
      // Get the appropriate client for the database
      const client = getClientForDB(db.db_type);
      
      // Run health check if the client supports it
      let result: HealthCheckResult;
      
      if (client.checkHealth) {
        // Get a decrypted copy of the database object for the health check
        const decryptedDb = await ConnectionsService.getConnectionWithDecryptedPassword(db.user_id, db.id);
        
        if (!decryptedDb) {
          return {
            isHealthy: false,
            latencyMs: 0,
            message: "Failed to decrypt database credentials",
            timestamp: new Date()
          };
        }
        
        result = await client.checkHealth(decryptedDb);
      } else {
        // Fall back to simple connection test
        const startTime = Date.now();
        const isConnected = await client.testConnection(db);
        const endTime = Date.now();
        
        result = {
          isHealthy: isConnected,
          latencyMs: endTime - startTime,
          message: isConnected ? "Connection successful" : "Connection failed",
          timestamp: new Date()
        };
      }
      
      // Store result in cache
      await this.storeHealthStatus(db.id, result);
      
      // Log result
      if (result.isHealthy) {
        healthLogger.info(`Health check passed for database ${db.id} (${db.db_type}): ${result.latencyMs}ms`);
      } else {
        healthLogger.warn(`Health check failed for database ${db.id} (${db.db_type}): ${result.message}`);
      }
      
      return result;
    } catch (error) {
      healthLogger.error(`Error running health check for database ${db.id}: ${(error as Error).message}`);
      
      const result: HealthCheckResult = {
        isHealthy: false,
        latencyMs: 0,
        message: `Health check error: ${(error as Error).message}`,
        timestamp: new Date()
      };
      
      // Store error result
      await this.storeHealthStatus(db.id, result);
      
      return result;
    }
  }
  
  /**
   * Store health status in Redis
   */
  private static async storeHealthStatus(dbId: number, result: HealthCheckResult): Promise<void> {
    try {
      // Validate that dbId is a valid integer
      if (!Number.isInteger(dbId)) {
        healthLogger.error(`Invalid database ID parameter in storeHealthStatus: dbId=${dbId}`);
        return;
      }
      
      const redisClient = await getRedisClient();
      
      const status = {
        id: dbId,
        isHealthy: result.isHealthy,
        latencyMs: result.latencyMs,
        message: result.message,
        lastChecked: result.timestamp
      };
      
      await redisClient.set(`db:health:${dbId}`, JSON.stringify(status), "EX", 300); // 5 minutes TTL
    } catch (error) {
      healthLogger.error(`Error storing health status: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get all unhealthy databases
   */
  static async getUnhealthyDatabases(): Promise<any[]> {
    try {
      const redisClient = await getRedisClient();
      const keys = await redisClient.keys('db:health:*');
      
      const unhealthyDatabases = [];
      
      for (const key of keys) {
        const status = await redisClient.get(key);
        
        if (status) {
          const parsedStatus = JSON.parse(status);
          
          if (!parsedStatus.isHealthy) {
            unhealthyDatabases.push(parsedStatus);
          }
        }
      }
      
      return unhealthyDatabases;
    } catch (error) {
      healthLogger.error(`Error getting unhealthy databases: ${(error as Error).message}`);
      return [];
    }
  }
}

/**
 * Helper function to get all database connections (admin only)
 * This would need to be implemented in your ConnectionsService
 */
async function getAllDatabaseConnections(): Promise<UserDatabase[]> {
  // Use the ConnectionsService to get all connections
  try {
    const result = await ConnectionsService.getAllConnections();
    return result;
  } catch (error) {
    healthLogger.error(`Failed to get all database connections: ${error}`);
    return [];
  }
}

export default DatabaseHealthServiceImpl;
