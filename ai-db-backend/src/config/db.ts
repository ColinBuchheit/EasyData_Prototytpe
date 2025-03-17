// src/config/db.ts
import { Pool } from "pg";
import { ENV } from "./env";
import logger from "./logger";
import { createClient } from "redis";
import RedisMock from "ioredis-mock"; // ✅ Mock Redis for local development

const MAX_CONNECTIONS = Number(process.env.DB_MAX_CONNECTIONS) || 10; // ✅ Configurable

// ✅ Lazy Initialization for Redis
let redisClient: any = null;
const getRedisClient = () => {
  if (!redisClient) {
    redisClient =
      ENV.NODE_ENV === "development"
        ? new RedisMock() // ✅ Use mock Redis in dev
        : createClient({ url: ENV.REDIS_URL || "redis://localhost:6379" });

    redisClient.on("error", (err: Error) => {
      logger.error(`❌ Redis error: ${err.message}`);
    });

    redisClient.connect();
    logger.info("✅ Redis client initialized.");
  }
  return redisClient;
};

// ✅ Create PostgreSQL connection pool
const pool = new Pool({
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  user: ENV.DB_USER,
  password: ENV.DB_PASSWORD,
  database: ENV.DB_DATABASE,
  max: MAX_CONNECTIONS,
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Wait 2 seconds before timing out
});

// ✅ Improved Connection Handling
const connectWithRetry = async (attempts = 3, delay = 5000) => {
  for (let i = 0; i < attempts; i++) {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1"); // Validates connection
      logger.info("✅ Database connected successfully.");
      return;
    } catch (err: unknown) {
      if (err instanceof Error) {
        logger.error(`❌ Database connection failed (Attempt ${i + 1}/${attempts}): ${err.message}`);
      } else {
        logger.error("❌ Database connection failed due to an unknown error.");
      }
      if (i < attempts - 1) {
        const nextDelay = delay * 2; // Exponential backoff
        logger.info(`🔄 Retrying in ${nextDelay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, nextDelay));
      } else {
        logger.error("❌ All retry attempts failed. Exiting...");
        process.exit(1);
      }
    } finally {
      client.release(); // ✅ Ensures cleanup of connection
    }
  }
};

connectWithRetry();

// ✅ Execution Time Logging for Queries
const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (duration > 500) { // Log slow queries (500ms threshold)
    logger.warn(`🐢 Slow Query Detected: ${text} - Duration: ${duration}ms`);
  }
  return result;
};

// ✅ Periodic Health Check (Every 60 seconds)
const checkDatabaseHealth = async () => {
  setInterval(async () => {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      logger.info("✅ Database is healthy.");
    } catch (err) {
      logger.error("⚠️ Database connection lost! Attempting to reconnect...");
      await connectWithRetry();
    } finally {
      client.release();
    }
  }, 60000);
};
checkDatabaseHealth();

// ✅ Graceful Shutdown Handling
const closeDatabase = async () => {
  logger.info("⚠️ Closing database connection...");
  await pool.end();
  logger.info("✅ Database connection closed.");
  process.exit(0);
};

const closeRedis = async () => {
  if (redisClient) {
    logger.info("⚠️ Closing Redis connection...");
    await redisClient.quit();
    logger.info("✅ Redis connection closed.");
  }
};

process.on("SIGINT", async () => {
  await closeRedis();
  await closeDatabase();
});
process.on("SIGTERM", async () => {
  await closeRedis();
  await closeDatabase();
});

export { pool, getRedisClient, query };
