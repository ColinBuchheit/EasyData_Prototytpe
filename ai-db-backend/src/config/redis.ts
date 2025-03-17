import { createClient } from "redis";
import logger from "./logger";

let redisClient: any = null;

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisClient.on("error", (err: Error) => logger.error(`❌ Redis error: ${err.message}`));

    try {
      await redisClient.connect();
      logger.info("✅ Connected to Redis");
    } catch (err: unknown) {
      if (err instanceof Error) {
        logger.error(`❌ Failed to connect to Redis: ${err.message}`);
      } else {
        logger.error("❌ Failed to connect to Redis: Unknown error.");
      }
      redisClient = null;
    }
  }
  return redisClient;
};

const closeRedis = async () => {
  if (!redisClient || !redisClient.isOpen) return;
  logger.info("⚠️ Closing Redis connection...");
  await redisClient.quit();
  logger.info("✅ Redis connection closed.");
};

process.on("SIGINT", closeRedis);
process.on("SIGTERM", closeRedis);
process.on("exit", async () => {
  await closeRedis();
  logger.info("✅ Application shutdown complete.");
});

export { getRedisClient };
