import http from "http";
import app from "./app";
import { ENV } from "./config/env";
import { pool } from "./config/db";
import logger from "./config/logger";
import { ConnectionManager } from "./services/connectionmanager";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";

dotenv.config();

const PORT = ENV.PORT || 5000;
const server = http.createServer(app);

// ✅ Initialize WebSocket Server
const wss = new WebSocketServer({ server });
export const activeConnections = new Map<number, WebSocket>(); // ✅ Now it can be imported!

logger.info("✅ WebSocket Server initialized.");

// ✅ WebSocket Authentication
const authenticateWebSocket = (token: string): number | null => {
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;

    if (typeof decoded === "object" && "id" in decoded) {
      return decoded.id as number; // ✅ TypeScript now recognizes `id`
    }

    return null;
  } catch (err) {
    return null;
  }
};


// ✅ WebSocket Event Handlers
wss.on("connection", (ws: WebSocket, req) => {
  const token = req.url?.split("?token=")[1];

  if (!token) {
    ws.send(JSON.stringify({ error: "❌ Unauthorized: Missing token" }));
    ws.close();
    return;
  }

  const userId = authenticateWebSocket(token);
  if (!userId) {
    ws.send(JSON.stringify({ error: "❌ Unauthorized: Invalid token" }));
    ws.close();
    return;
  }

  logger.info(`🔗 User ${userId} connected via WebSocket.`);
  activeConnections.set(userId, ws);

  ws.on("message", async (message) => {
    logger.info(`📩 Message from User ${userId}: ${message}`);
    
    if (message.toString().startsWith("QUERY:")) {
      // Handle query processing
      const queryText = message.toString().replace("QUERY:", "").trim();
      const aiResponse = await ConnectionManager.processQuery(userId, queryText);
      ws.send(JSON.stringify({ type: "query_response", data: aiResponse }));
    } else if (message.toString().startsWith("SCHEMA:")) {
      // Handle schema retrieval
      const dbType = message.toString().replace("SCHEMA:", "").trim();
      const schemaData = await ConnectionManager.getSchema(userId, dbType);
      ws.send(JSON.stringify({ type: "schema_response", data: schemaData }));
    } else {
      ws.send(JSON.stringify({ error: "❌ Unknown message type." }));
    }
  });

  ws.on("close", () => {
    logger.info(`❌ User ${userId} disconnected.`);
    activeConnections.delete(userId);
  });
});

// ✅ Start the Server
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});

// ✅ Graceful Shutdown Handling
const gracefulShutdown = async () => {
  logger.info("⚠️ Initiating graceful shutdown...");

  // ✅ Close all active database connections
  await ConnectionManager.closeAllConnections();
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
