// src/server.ts
import dotenv from "dotenv";
dotenv.config(); // ✅ Ensure environment variables are loaded first

import app from "./app";
import { ENV } from "./config/env"; // ✅ Use ENV for consistency
import logger from "./config/logger";

// ✅ Start the server
const server = app.listen(ENV.PORT, () => {
  logger.info(`🚀 Server running on port ${ENV.PORT}`);
});

// ✅ Graceful shutdown handling
const shutdown = () => {
  logger.info("🔄 Shutting down server gracefully...");
  server.close(() => {
    logger.info("✅ Server closed.");
    process.exit(0);
  });
};

// Handle termination signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
