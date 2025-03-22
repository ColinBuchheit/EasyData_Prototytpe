import { Request, Response } from "express";
import { processAIQuery, processUserQuery, executeDatabaseQuery, validateQueryAgainstSchema } from "../services/query.service";
import { AuthRequest } from "../middleware/auth";
import logger from "../config/logger";
import * as ws from "ws";
type NodeWebSocket = ws.WebSocket;
import { AuthService } from "../services/auth.service";
import { fetchDatabaseById, fetchUserDatabases, runQueryOnUserDB } from "../services/userdb.service"; // ✅ Your new logic
import { runOrchestration } from "../services/agent.service";
import { 
  detectDatabaseFromQuery, 
  detectContextSwitch, 
  getCurrentDatabaseContext,
  selectDatabaseForQuery 
} from "../services/databaseContext.service";
import { handleMultiDatabaseQuery } from "../services/multiDbQuery.service";
import { getMongoClient } from "../config/db";


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

export const processAIOrchestration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { dbId, task, visualize = true } = req.body;

    if (!dbId || !task) {
      sendErrorResponse(res, 400, "Missing required fields: dbId or task.");
      return;
    }

    const userDB = await fetchDatabaseById(userId, dbId);
    if (!userDB) {
      sendErrorResponse(res, 404, `Database ${dbId} not found.`);
      return;
    }

    const orchestrationInput = {
      task,
      database: userDB,
      options: { visualize }
    };

    const result = await runOrchestration(orchestrationInput);
    res.json(result);

  } catch (error) {
    sendErrorResponse(res, 500, "Failed to run agent orchestration.", error as Error);
  }
};

export const executeUserDBQuery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { dbId, query } = req.body;

    if (!dbId || typeof dbId !== "number") {
      sendErrorResponse(res, 400, "Missing or invalid dbId.");
      return;
    }

    if (!query || typeof query !== "string") {
      sendErrorResponse(res, 400, "Invalid or missing query.");
      return;
    }

    const userDB = await fetchDatabaseById(userId, dbId);
    if (!userDB) {
      sendErrorResponse(res, 404, `Database connection ${dbId} not found.`);
      return;
    }

    const result = await runQueryOnUserDB(userDB, query);
    res.json({ result });
  } catch (error) {
    sendErrorResponse(res, 500, "Failed to run query on user database.", error as Error);
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

// Add this new method for smart queries
export const processAIQueryWithContext = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { task } = req.body;
    
    if (!task) {
      sendErrorResponse(res, 400, "Missing required field: task.");
      return;
    }
    
    // Step 1: Check for explicit context switching
    const contextSwitch = await detectContextSwitch(userId, task);
    if (contextSwitch.switched) {
      // Database context was switched, inform the user
      res.json({
        success: true,
        message: contextSwitch.message,
        dbId: contextSwitch.dbId
      });
      return;
    }
    
    // Step 2: Check if this is a multi-database query
    const isMultiDbQuery = /across databases|from (all|both) (my|databases|dbs)/i.test(task);
    
    if (isMultiDbQuery) {
      // Fetch all user databases
      const allDatabases = await fetchUserDatabases(userId);
      const dbIds = allDatabases.map(db => db.id);
      
      // Process multi-database query
      const result = await handleMultiDatabaseQuery(userId, task, dbIds);
      res.json(result);
      return;
    }
    
    // Step 3: Use intelligent AI-based database selection
    let dbId = await selectDatabaseForQuery(userId, task);
    
    if (!dbId) {
      // Fall back to current context
      dbId = await getCurrentDatabaseContext(userId);
    }
    
    if (!dbId) {
      sendErrorResponse(res, 400, "Could not determine which database to use. Please specify a database.");
      return;
    }
    
    // Fetch the selected database
    const userDB = await fetchDatabaseById(userId, dbId);
    if (!userDB) {
      sendErrorResponse(res, 404, `Database ${dbId} not found.`);
      return;
    }
    
    // Standard processing with the detected database
    const orchestrationInput = {
      task,
      database: userDB,
      options: { visualize: true }
    };
    
    const result = await runOrchestration(orchestrationInput);
    
    // Update query history for better future matching
    await recordQueryHistory(userId, dbId, task);
    
    res.json(result);
    
  } catch (error) {
    sendErrorResponse(res, 500, "Failed to process query with context.", error as Error);
  }
};

// Add tracking for query history
async function recordQueryHistory(userId: number, dbId: number, query: string): Promise<void> {
  try {
    const client = await getMongoClient();
    await client.db().collection('query_history').insertOne({
      userId: userId.toString(),
      dbId,
      query,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error(`❌ Error recording query history: ${(error as Error).message}`);
    // Non-critical operation, so we just log the error but don't throw
  }
}



