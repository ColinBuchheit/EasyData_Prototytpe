import http from "http";
import app from "./app";
import { ENV } from "./config/env";
import { pool } from "./config/db"; // ✅ Fixes TS2613
import logger from "./config/logger";
import { ConnectionManager } from "./services/connectionmanager";

const PORT = ENV.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});

// ✅ Graceful Shutdown Handling
const gracefulShutdown = async () => {
  logger.info("⚠️ Initiating graceful shutdown...");

  // ✅ Close all active database connections
  await ConnectionManager.closeAllConnections(); // ✅ Fixed missing method
  await pool.end();

  logger.info("✅ Database connections closed.");

  server.close(() => {
    logger.info("✅ Server shutdown complete.");
    process.exit(0);
  });
};

// ✅ Handle process termination signals
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
