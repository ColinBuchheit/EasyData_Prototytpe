import { createClient } from "redis";
import logger from "./logger";

// ✅ Initialize Redis Client
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379", // Use environment variable or default to localhost
});

redisClient.on("error", (err) => logger.error("❌ Redis error:", err));

(async () => {
  await redisClient.connect();
  logger.info("✅ Connected to Redis");
})();

export default redisClient;
