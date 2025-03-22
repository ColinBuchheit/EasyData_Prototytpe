// src/config/db.ts
import { Pool } from "pg";
import { ENV } from "./env";
import logger from "./logger";
import { createClient } from "redis";
import RedisMock from "ioredis-mock";
import { MongoClient } from "mongodb";

const MAX_CONNECTIONS = Number(process.env.DB_MAX_CONNECTIONS) || 10;

// ========================
// ✅ REDIS CONFIG
// ========================
let redisClient: any = null;
const getRedisClient = () => {
  if (!redisClient) {
    redisClient =
      ENV.NODE_ENV === "development"
        ? new RedisMock()
        : createClient({ url: ENV.REDIS_URL || "redis://localhost:6379" });

    redisClient.on("error", (err: Error) => {
      logger.error(`❌ Redis error: ${err.message}`);
    });

    redisClient.connect();
    logger.info("✅ Redis client initialized.");
  }
  return redisClient;
};

// ========================
// ✅ POSTGRES CONFIG
// ========================
const pool = new Pool({
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  user: ENV.DB_USER,
  password: ENV.DB_PASSWORD,
  database: ENV.DB_DATABASE,
  max: MAX_CONNECTIONS,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const connectWithRetry = async (attempts = 3, delay = 5000) => {
  for (let i = 0; i < attempts; i++) {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      logger.info("✅ PostgreSQL connected.");
      return;
    } catch (err: unknown) {
      logger.error(`❌ PostgreSQL connection failed (Attempt ${i + 1}/${attempts}): ${err instanceof Error ? err.message : err}`);
      if (i < attempts - 1) {
        const nextDelay = delay * 2;
        logger.info(`🔄 Retrying in ${nextDelay / 1000} seconds...`);
        await new Promise((res) => setTimeout(res, nextDelay));
      } else {
        logger.error("❌ All PostgreSQL attempts failed.");
        process.exit(1);
      }
    } finally {
      client.release();
    }
  }
};
connectWithRetry();

const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 500) {
    logger.warn(`🐢 Slow Query: ${text} (${duration}ms)`);
  }
  return result;
};

const checkDatabaseHealth = async () => {
  setInterval(async () => {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      logger.info("✅ PostgreSQL is healthy.");
    } catch (err) {
      logger.error("⚠️ PostgreSQL health check failed.");
      await connectWithRetry();
    } finally {
      client.release();
    }
  }, 60000);
};
checkDatabaseHealth();

const closeDatabase = async () => {
  logger.info("⚠️ Closing PostgreSQL...");
  await pool.end();
  logger.info("✅ PostgreSQL closed.");
};

const closeRedis = async () => {
  if (redisClient) {
    logger.info("⚠️ Closing Redis...");
    await redisClient.quit();
    logger.info("✅ Redis closed.");
  }
};

// ========================
// ✅ MONGODB CONFIG
// ========================
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ai_conversations";
let mongoClient: MongoClient | null = null;

const getMongoClient = async (): Promise<MongoClient> => {
  if (mongoClient) {
    return mongoClient;
  }
  

  mongoClient = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as any);

  await mongoClient.connect();
  logger.info("✅ MongoDB connected.");
  return mongoClient;
};

const closeMongo = async () => {
  if (mongoClient) {
    logger.info("⚠️ Closing MongoDB...");
    await mongoClient.close();
    logger.info("✅ MongoDB closed.");
  }
};

// ========================
// ✅ SHUTDOWN HOOKS
// ========================
process.on("SIGINT", async () => {
  await closeRedis();
  await closeMongo();
  await closeDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeRedis();
  await closeMongo();
  await closeDatabase();
  process.exit(0);
});

// ========================
// ✅ EXPORTS
// ========================
export { pool, getRedisClient, getMongoClient, query };
