// src/server.ts
import http from "http";
import { Server as WebSocketServer } from "ws";
import dotenv from "dotenv";

// Load environment variables ONCE and EARLY, before any other imports
dotenv.config();

import logger from "./config/logger";
import { pool, closeMongo, closeDatabase, getMongoClient } from "./config/db";
import { closeRedis, getRedisClient, checkRedisHealth } from "./config/redis";
import app from "./app";
import { initializeWebSocketHandlers } from "./modules/query/middleware/websocket.middleware";
import { safeDisconnect } from "./shared/utils/connectionHelpers";

// Create a server logger specifically for startup
const serverLogger = logger.child({ context: 'Server' });

// Add explicit console log to verify server initialization
console.log('[Server] Starting server initialization');
serverLogger.info('Starting server initialization');

// Create an HTTP server
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocketServer({ server });

// Set up WebSocket handlers
initializeWebSocketHandlers(wss);

/**
 * Run startup diagnostics
 */
async function runStartupDiagnostics() {
  serverLogger.info('🔍 Running startup diagnostics...');
  
  // Test MongoDB
  try {
    serverLogger.info('Testing MongoDB connection...');
    const client = await getMongoClient();
    await client.db().admin().ping();
    serverLogger.info('✅ MongoDB connection successful');
  } catch (error) {
    serverLogger.error(`❌ MongoDB test failed: ${(error as Error).message}`);
  }
  
  // Test Redis
  try {
    serverLogger.info('Testing Redis connection...');
    const client = await getRedisClient();
    const pingResult = await client.ping();
    serverLogger.info(`✅ Redis ping returned: ${pingResult}`);
  } catch (error) {
    serverLogger.error(`❌ Redis test failed: ${(error as Error).message}`);
  }
  
  // Test AI Agent
  try {
    const axios = require('axios');
    const AI_AGENT_URL = process.env.AI_AGENT_API || 'http://localhost:5001';
    const AI_API_KEY = process.env.AI_API_KEY || '';
    
    serverLogger.info(`Testing AI Agent connection to ${AI_AGENT_URL}...`);
    
    const response = await axios.get(`${AI_AGENT_URL}/api/v1/health`, {
      timeout: 5000,
      headers: { 'Authorization': `Bearer ${AI_API_KEY}` }
    });
    
    if (response.data && response.data.status === 'ok') {
      serverLogger.info('✅ AI Agent connection successful');
    } else {
      serverLogger.warn(`⚠️ AI Agent returned unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    serverLogger.error(`❌ AI Agent test failed: ${(error as Error).message}`);
  }
  
  serverLogger.info('🔍 Startup diagnostics complete');
}

// Define graceful shutdown function
const gracefulShutdown = async () => {
  serverLogger.info("🛑 Shutting down server...");
  
  // Close WebSockets first
  wss.close((err) => {
    if (err) {
      serverLogger.error(`❌ Error closing WebSocket server: ${err.message}`);
    } else {
      serverLogger.info("✅ WebSocket server closed successfully");
    }
  });
  
  // Close database connections
  await Promise.allSettled([
    safeDisconnect(closeRedis, "Redis"),
    safeDisconnect(closeMongo, "MongoDB"),
    safeDisconnect(closeDatabase, "PostgreSQL")
  ]);
  
  serverLogger.info("✅ Server shutdown complete");
  process.exit(0);
};

// Register shutdown handlers
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("uncaughtException", (error) => {
  serverLogger.error(`❌ Uncaught Exception: ${error.message}`);
  serverLogger.error(error.stack || "No stack trace available");
  gracefulShutdown();
});
process.on("unhandledRejection", (reason, promise) => {
  serverLogger.error(`❌ Unhandled Promise Rejection at: ${promise}, reason: ${reason}`);
  gracefulShutdown();
});

// Start Server & Database Connection
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  try {
    console.log(`[Server] Server listening on port ${PORT}`);
    serverLogger.info(`Server starting on port ${PORT}...`);
    
    // Connect to PostgreSQL
    await pool.connect();
    serverLogger.info(`🚀 Server running on port ${PORT}`);
    serverLogger.info(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
    
    // Log environment
    serverLogger.info(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
    
    // Run diagnostics
    await runStartupDiagnostics();
    
    serverLogger.info(`🌐 Server is fully initialized and ready to accept connections`);
  } catch (error) {
    serverLogger.error(`❌ Database connection failed: ${(error as Error).message}`);
    console.error(`[SERVER ERROR] Database connection failed: ${(error as Error).message}`);
    process.exit(1); // Exit if DB connection fails
  }
});

export { server, wss };