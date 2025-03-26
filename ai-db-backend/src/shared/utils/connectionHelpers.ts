// src/shared/utils/connectionHelpers.ts

import { createContextLogger } from "../../config/logger";

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
  
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      connectionLogger.info(`Attempting to connect to ${resourceName} (Attempt ${attempt}/${attempts})...`);
      const result = await connectFn();
      connectionLogger.info(`Successfully connected to ${resourceName}.`);
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      connectionLogger.error(`${resourceName} connection failed (Attempt ${attempt}/${attempts}): ${errorMessage}`);
      
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
    connectionLogger.info(`Successfully closed connection to ${resourceName}.`);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    connectionLogger.error(`Error closing connection to ${resourceName}: ${errorMessage}`);
  }
}