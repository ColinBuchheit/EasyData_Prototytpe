// src/shared/utils/connectionHelpers.ts

import { createContextLogger } from "../../config/logger";
import os from "os";

const connectionLogger = createContextLogger("ConnectionHelpers");

/**
 * Retry configuration for database connections
 */
export interface RetryOptions {
  attempts: number;
  initialDelay: number;
  maxDelay: number;
  factor?: number;
  jitter?: boolean;
}

/**
 * Default retry options
 */
export const defaultRetryOptions: RetryOptions = {
  attempts: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
  jitter: true
};

/**
 * Track connection statuses for health reporting
 */
export const connectionStatus: Record<string, {
  connected: boolean;
  lastAttempt: Date;
  error?: string;
  hostInfo?: string;
}> = {};

/**
 * Generic retry handler for database connections
 * @param connectFn Function that attempts to establish a connection
 * @param resourceName Name of the resource (for logging)
 * @param options Retry configuration
 * @returns The connection result
 */
export async function connectWithRetry<T>(
  connectFn: () => Promise<T>,
  resourceName: string,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const retryOptions = { ...defaultRetryOptions, ...options };
  let { attempts, initialDelay, maxDelay, factor = 2, jitter = true } = retryOptions;
  let delay = initialDelay;
  
  // Initialize connection status
  connectionStatus[resourceName] = {
    connected: false,
    lastAttempt: new Date()
  };
  
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      connectionLogger.info(`Attempting to connect to ${resourceName} (Attempt ${attempt}/${attempts})...`);
      connectionStatus[resourceName].lastAttempt = new Date();
      
      const startTime = Date.now();
      const result = await connectFn();
      const connectionTime = Date.now() - startTime;
      
      // Update connection status
      connectionStatus[resourceName] = {
        connected: true,
        lastAttempt: new Date(),
        hostInfo: getHostInfo(resourceName)
      };
      
      connectionLogger.info(`Successfully connected to ${resourceName} in ${connectionTime}ms.`);
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      connectionLogger.error(`${resourceName} connection failed (Attempt ${attempt}/${attempts}): ${errorMessage}`);
      
      // Update connection status
      connectionStatus[resourceName] = {
        connected: false,
        lastAttempt: new Date(),
        error: errorMessage,
        hostInfo: getHostInfo(resourceName)
      };
      
      if (attempt < attempts) {
        // Calculate next delay with exponential backoff
        delay = Math.min(delay * factor, maxDelay);
        
        // Add jitter if enabled (±20%)
        if (jitter) {
          const jitterAmount = delay * 0.2;
          delay = delay - jitterAmount + (Math.random() * jitterAmount * 2);
        }
        
        connectionLogger.info(`Retrying in ${Math.round(delay / 1000)} seconds...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        connectionLogger.error(`All ${resourceName} connection attempts failed.`);
        throw new Error(`Failed to connect to ${resourceName} after ${attempts} attempts: ${errorMessage}`);
      }
    }
  }
  
  // TypeScript requires this even though it's unreachable
  throw new Error(`Failed to connect to ${resourceName}`);
}

/**
 * Safe disconnect function that catches errors
 * @param disconnectFn Function that disconnects from a resource
 * @param resourceName Name of the resource (for logging)
 */
export async function safeDisconnect(
  disconnectFn: () => Promise<void>,
  resourceName: string
): Promise<void> {
  try {
    connectionLogger.info(`Closing connection to ${resourceName}...`);
    await disconnectFn();
    
    // Update connection status
    if (connectionStatus[resourceName]) {
      connectionStatus[resourceName].connected = false;
    }
    
    connectionLogger.info(`Successfully closed connection to ${resourceName}.`);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    connectionLogger.error(`Error closing connection to ${resourceName}: ${errorMessage}`);
  }
}

/**
 * Get host information for a resource
 */
function getHostInfo(resourceName: string): string {
  // Extract host info from environment variables based on resource
  let hostInfo = "";
  
  if (resourceName.includes("PostgreSQL")) {
    hostInfo = `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`;
  } else if (resourceName.includes("MongoDB")) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
    hostInfo = mongoUri.split('@').pop() || mongoUri;
  } else if (resourceName.includes("Redis")) {
    hostInfo = process.env.REDIS_URL || 'redis://localhost:6379';
  } else if (resourceName.includes("AI Agent")) {
    hostInfo = process.env.AI_AGENT_API || 'http://localhost:5001';
  }
  
  return hostInfo;
}

/**
 * Get status of all connections
 */
export function getConnectionsStatus(): Record<string, {
  connected: boolean;
  lastAttempt: Date;
  error?: string;
  hostInfo?: string;
}> {
  return { ...connectionStatus };
}