import { Request, Response } from "express";
import { processAIQuery, processUserQuery, executeDatabaseQuery, validateQueryAgainstSchema } from "../services/query.service";
import { AuthRequest } from "../middleware/auth";
import logger from "../config/logger";
import * as ws from "ws";
type NodeWebSocket = ws.WebSocket;
import { AuthService } from "../services/auth.service";

console.log("WebSocket Type:", WebSocket);
console.log("WebSocket Instance Type:", new WebSocket("ws://localhost:8080"));

/**
 * Helper function to send an error response
 */
const sendErrorResponse = (res: Response, statusCode: number, message: string, error?: Error) => {
  logger.error(`❌ ${message}${error ? `: ${error.message}` : ""}`);
  res.status(statusCode).json({ message, error: error?.message });
};

/**
 * ✅ REST API: Handles user-submitted SQL queries via HTTP request.
 */
export const executeUserQuery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { dbType, query } = req.body;

    if (!query || typeof query !== "string") {
      sendErrorResponse(res, 400, "Invalid or missing query.");
      return;
    }

    if (!dbType) {
      sendErrorResponse(res, 400, "Missing database type.");
      return;
    }

    logger.info(`📡 User ${userId} is requesting query execution: ${query}`);

    // ✅ Use the same AI processing function to handle user queries for consistency
    const result = await processUserQuery(userId, query, dbType);
    res.json(result);
  } catch (error) {
    sendErrorResponse(res, 500, "Query execution failed.", error as Error);
  }
};

/**
 * ✅ WebSocket API: Handles AI-generated query processing.
 */
export const handleWebSocketAIQuery = (wsClient: NodeWebSocket, req: Request): void => { 
  if (!(wsClient instanceof ws.WebSocket)) {  // ✅ Ensure WebSocket is from 'ws'
    logger.error("❌ Invalid WebSocket instance.");
    return;
  }
  const socket = wsClient as NodeWebSocket; // ✅ Ensure correct WebSocket instance




  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      sendWebSocketError(socket, "Unauthorized: Missing token.");
      return;
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded || "error" in decoded) {
      sendWebSocketError(socket, "Unauthorized: Invalid or expired token.");
      return;
    }

    const userId = Number(decoded.userId); // ✅ Ensure userId is always a number
    logger.info(`✅ WebSocket connection established for user ${userId}.`);

    socket.on("message", async (message) => handleWebSocketMessage(socket, userId, message));
    socket.on("close", () => logger.info(`🔌 WebSocket Disconnected for user ${userId}`));

  } catch (error) {
    sendWebSocketError(socket, "Server error.", error as Error);
  }
};


/**
 * Helper function to send error messages via WebSocket
 */
const sendWebSocketError = (socket: ws.WebSocket, message: string, error?: Error) => {
  logger.error(`❌ WebSocket Error: ${message}${error ? `: ${error.message}` : ""}`);
  socket.send(JSON.stringify({ type: "error", message }));
  socket.close();
};

const handleWebSocketMessage = async (socket: ws.WebSocket, userId: number, message: ws.RawData) => {
  try {
    const userMessage = message.toString().trim();

    if (!userMessage) {
      sendWebSocketError(socket, "Invalid input: Empty message.");
      return;
    }

    await processAIQuery(userId, userMessage, socket as ws.WebSocket); // ✅ Force correct WebSocket type
  } catch (error) {
    sendWebSocketError(socket, "AI Query Processing Failed.", error as Error);
  }
};



