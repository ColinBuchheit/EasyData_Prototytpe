// src/config/db.ts
import { Pool } from "pg";
import { ENV } from "./env";
import logger from "./logger";
import { createClient } from "redis";
import RedisMock from "ioredis-mock"; // ✅ Mock Redis for local development

const MAX_CONNECTIONS = Number(process.env.DB_MAX_CONNECTIONS) || 10; // ✅ Configurable

// ✅ Start Redis (Use `ioredis-mock` in Dev, Real Redis in Prod/Docker)
const redisClient =
  ENV.NODE_ENV === "development"
    ? new RedisMock() // ✅ Use mock Redis in dev
    : createClient({ url: ENV.REDIS_URL || "redis://localhost:6379" });

redisClient.on("error", (err) => {
  logger.error(`❌ Redis error: ${err.message}`);
});

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

const connectWithRetry = async (attempts = 3, delay = 5000) => {
  for (let i = 0; i < attempts; i++) {
    try {
      await pool.query("SELECT 1");
      logger.info("✅ Database connected successfully.");
      return;
    } catch (err: unknown) {  // ✅ Change Error to unknown
      if (err instanceof Error) { // ✅ Ensure it's an Error object before accessing properties
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
    }
  }
};

connectWithRetry();

// 🔹 Handle Unexpected Errors Gracefully
pool.on("error", (err: Error) => {
  logger.error(`❌ Unexpected database error: ${err.message}`);
});

const checkDatabaseHealth = async () => {
  setInterval(async () => {
    try {
      await pool.query("SELECT 1");
      logger.info("✅ Database is healthy.");
    } catch (err) {
      logger.error("⚠️ Database connection lost! Attempting to reconnect...");
      await connectWithRetry();
    }
  }, 60000); // Check every 60 seconds
};
checkDatabaseHealth();

// 🔹 Close Pool on App Shutdown (Graceful Exit)
const closeDatabase = async () => {
  logger.info("⚠️ Closing database connection...");
  await pool.end();
  logger.info("✅ Database connection closed.");
  process.exit(0);
};

const closeRedis = async () => {
  logger.info("⚠️ Closing Redis connection...");
  await redisClient.quit();
  logger.info("✅ Redis connection closed.");
};

process.on("SIGINT", async () => {
  await closeRedis();
  await closeDatabase();
});
process.on("SIGTERM", async () => {
  await closeRedis();
  await closeDatabase();
});

export { pool, redisClient };