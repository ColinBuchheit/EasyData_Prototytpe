// src/config/redis.ts
import { createClient } from "redis";
import RedisMock from "ioredis-mock";
import { ENV } from "./env";
import { createContextLogger } from "./logger";
import { connectWithRetry } from "../shared/utils/connectionHelpers";

const redisLogger = createContextLogger("Redis");

// Single Redis client instance
let redisClient: any = null;

/**
 * Get or initialize Redis client with development mode support
 */
export const getRedisClient = async () => {
  if (!redisClient) {
    try {
      // Use mock for development, real client for other environments
      if (ENV.NODE_ENV === "development" && process.env.USE_REDIS_MOCK === "true") {
        redisLogger.info("Using Redis mock for development");
        redisClient = new RedisMock();
        await redisClient.connect();
      } else {
        redisLogger.info(`Connecting to Redis at ${ENV.REDIS_URL}`);
        redisClient = createClient({ url: ENV.REDIS_URL });
        
        redisClient.on("error", (err: Error) => {
          redisLogger.error(`Redis error: ${err.message}`);
        });
        
        await connectWithRetry(
          async () => {
            await redisClient.connect();
            redisLogger.info("Redis connected successfully");
          },
          "Redis",
          { attempts: 5, initialDelay: 1000 }
        );
      }
    } catch (err) {
      redisLogger.error(`Failed to connect to Redis: ${(err as Error).message}`);
      redisClient = null;
      throw err;
    }
  }
  
  return redisClient;
};

/**
 * Close Redis connection gracefully
 */
export const closeRedis = async () => {
  if (!redisClient) return;
  
  try {
    redisLogger.info("Closing Redis connection...");
    await redisClient.quit();
    redisClient = null;
    redisLogger.info("Redis connection closed");
  } catch (error) {
    redisLogger.error(`Error closing Redis connection: ${(error as Error).message}`);
  }
};

// Health check function
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const client = await getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    redisLogger.error(`Redis health check failed: ${(error as Error).message}`);
    return false;
  }
};