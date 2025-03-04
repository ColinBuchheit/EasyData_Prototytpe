import { Pool } from "pg";
import { ENV } from "./env";
import logger from "./logger";
import { createClient } from "redis";
import RedisMock from "ioredis-mock"; // ✅ Mock Redis for local development

const MAX_CONNECTIONS = Number(process.env.DB_MAX_CONNECTIONS) || 10; // ✅ Configurable

// ✅ Ensure DB_TYPE is included for multi-DB support (future-proofing)
if (!ENV.DB_TYPE) {
  logger.error("❌ Missing DB_TYPE in environment variables.");
  process.exit(1);
}

// ✅ Start Redis (Use `ioredis-mock` in Dev, Real Redis in Prod/Docker)
const redisClient =
  ENV.NODE_ENV === "development"
    ? new RedisMock() // ✅ Use mock Redis in dev
    : createClient({ url: ENV.REDIS_URL || "redis://localhost:6379" });

let redisConnected = false; // ✅ Prevent duplicate logs

redisClient.on("connect", () => {
  if (!redisConnected) {
    redisConnected = true;
  }
});

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
  max: MAX_CONNECTIONS, // ✅ Now configurable
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Wait 2 seconds before timing out
});

// 🔹 Attempt DB Connection with Retry Logic
const connectWithRetry = async (attempts = 3, delay = 5000) => {
  for (let i = 0; i < attempts; i++) {
    try {
      await pool.query("SELECT 1"); // ✅ Simple query to verify connection
      logger.info("✅ Database connected successfully.");
      return;
    } catch (err: any) { // ✅ Explicitly define `err` type
      logger.error(`❌ Database connection failed (Attempt ${i + 1}/${attempts}): ${err.message}`);
      if (i < attempts - 1) {
        logger.info(`🔄 Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        logger.error("❌ All retry attempts failed. Exiting...");
        process.exit(1);
      }
    }
  }
};

// 🔹 Start DB Connection with Retry Mechanism
connectWithRetry();

// 🔹 Handle Unexpected Errors Gracefully
pool.on("error", (err: Error) => {
  logger.error(`❌ Unexpected database error: ${err.message}`);
});

// 🔹 Close Pool on App Shutdown (Graceful Exit)
const closeDatabase = async () => {
  logger.info("⚠️ Closing database connection...");
  await pool.end();
  logger.info("✅ Database connection closed.");
  process.exit(0);
};

process.on("SIGINT", closeDatabase);
process.on("SIGTERM", closeDatabase);

export { pool, redisClient }; // ✅ Export Redis client for use in other files
