import { createClient } from "redis";
import logger from "./logger";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => logger.error(`❌ Redis error: ${err.message}`));

(async () => {
  try {
    await redisClient.connect();
    logger.info("✅ Connected to Redis");
  } catch (err) {
    logger.error(`❌ Failed to connect to Redis: ${(err as Error).message}`);
  }
})();

const closeRedis = async () => {
  if (!redisClient.isOpen) return;
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

export default redisClient;