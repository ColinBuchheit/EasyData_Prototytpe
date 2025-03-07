import { createClient } from "redis";
import logger from "./logger";

// ✅ Initialize Redis Client
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379", // Use environment variable or default to localhost
});

redisClient.on("error", (err) => logger.error(`❌ Redis error: ${err.message}`));

(async () => {
  await redisClient.connect();
  logger.info("✅ Connected to Redis");
})();

const closeRedis = async () => {
  if (!redisClient.isOpen) return; // Prevent errors if already closed
  logger.info("⚠️ Closing Redis connection...");
  await redisClient.quit();
  logger.info("✅ Redis connection closed.");
};


process.on("SIGINT", closeRedis);
process.on("SIGTERM", closeRedis);


export default redisClient;
