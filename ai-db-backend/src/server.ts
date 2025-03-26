// src/server.ts
import http from "http";
import { Server as WebSocketServer } from "ws";
import dotenv from "dotenv";
import logger from "./config/logger";
import { pool, closeMongo, closeDatabase } from "./config/db";
import { closeRedis } from "./config/redis";
import app from "./app";
import { initializeWebSocketHandlers } from "./modules/query/middleware/websocket.middleware";
import { safeDisconnect } from "./shared/utils/connectionHelpers";

// Load environment variables
dotenv.config();

// Create an HTTP server
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocketServer({ server });

// Set up WebSocket handlers
initializeWebSocketHandlers(wss);

// Define graceful shutdown function
const gracefulShutdown = async () => {
  logger.info("🛑 Shutting down server...");
  
  // Close WebSockets first
  wss.close((err) => {
    if (err) {
      logger.error(`❌ Error closing WebSocket server: ${err.message}`);
    } else {
      logger.info("✅ WebSocket server closed successfully");
    }
  });
  
  // Close database connections
  await Promise.allSettled([
    safeDisconnect(closeRedis, "Redis"),
    safeDisconnect(closeMongo, "MongoDB"),
    safeDisconnect(closeDatabase, "PostgreSQL")
  ]);
  
  logger.info("✅ Server shutdown complete");
  process.exit(0);
};

// Register shutdown handlers
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("uncaughtException", (error) => {
  logger.error(`❌ Uncaught Exception: ${error.message}`);
  logger.error(error.stack || "No stack trace available");
  gracefulShutdown();
});
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`❌ Unhandled Promise Rejection at: ${promise}, reason: ${reason}`);
  gracefulShutdown();
});

// Start Server & Database Connection
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  try {
    await pool.connect();
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
    
    // Log environment
    logger.info(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
  } catch (error) {
    logger.error(`❌ Database connection failed: ${(error as Error).message}`);
    process.exit(1); // Exit if DB connection fails
  }
});

export { server, wss };