import http from "http";
import { Server as WebSocketServer } from "ws";
import dotenv from "dotenv";
import logger from "./config/logger";
import { pool } from "./config/db";
import app from "./app";

// ✅ Load environment variables
dotenv.config();

// ✅ Create an HTTP server
const server = http.createServer(app);

// ✅ Initialize WebSocket Server
const wss = new WebSocketServer({ server });

// ✅ WebSocket Connection Handling
wss.on("connection", (ws, req) => {
  logger.info("🔌 WebSocket Connected");

  ws.on("message", async (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      const { token, action, data } = parsedMessage;

      if (!token) {
        ws.send(JSON.stringify({ type: "error", message: "❌ Unauthorized WebSocket connection." }));
        ws.close();
        return;
      }

      ws.send(JSON.stringify({ type: "processing", message: "Processing your request..." }));
    } catch (error) {
      logger.error(`❌ WebSocket Error: ${(error as Error).message}`);
      ws.send(JSON.stringify({ type: "error", message: "❌ WebSocket processing failed." }));
    }
  });

  ws.on("close", () => {
    logger.info("🔌 WebSocket Disconnected");
  });
});

// ✅ Start Server & Database Connection
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  try {
    await pool.connect();
    logger.info(`🚀 Server running on port ${PORT}`);
  } catch (error) {
    logger.error(`❌ Database connection failed: ${(error as Error).message}`);
    process.exit(1); // Exit if DB fails
  }
});

export { server, wss };
