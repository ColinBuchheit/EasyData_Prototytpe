// src/modules/query/controllers/ai-query.controller.ts

import { Response } from "express";
import * as ws from "ws";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { AIAgentService } from "../services/ai-agent.service";
import { ContextService } from "../services/context.service";
import { ConnectionsService } from "../../database/services/connections.service";
import { QueryService } from "../services/query.service";
import { AIQueryRequest, NaturalLanguageQueryRequest } from "../models/query.model";
import { sendMessage } from "../middleware/websocket.middleware";

const aiQueryLogger = createContextLogger("AIQueryController");

/**
 * Process a natural language query and execute the resulting SQL
 */
export const processNaturalLanguageQuery = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const { task, dbId, visualize = true }: NaturalLanguageQueryRequest = req.body;
  
  if (!task || typeof task !== "string") {
    return res.status(400).json({ success: false, message: "Task description is required" });
  }
  
  // First check for explicit context switching
  const contextSwitch = await ContextService.detectContextSwitch(req.user.id, task);
  if (contextSwitch.switched) {
    return res.json({
      success: true,
      message: contextSwitch.message,
      dbId: contextSwitch.dbId,
      contextSwitched: true
    });
  }
  
  // Determine which database to use
  let targetDbId = dbId;
  
  // If no dbId provided, detect from query or use current context
  if (!targetDbId) {
    targetDbId = await ContextService.selectDatabaseForQuery(req.user.id, task);
    
    if (!targetDbId) {
      targetDbId = await ContextService.getCurrentDatabaseContext(req.user.id);
    }
    
    if (!targetDbId) {
      return res.status(400).json({
        success: false,
        message: "Could not determine which database to use. Please specify a database."
      });
    }
  }
  
  // Get the database
  const database = await ConnectionsService.getConnectionById(req.user.id, targetDbId);
  if (!database) {
    return res.status(404).json({
      success: false,
      message: `Database ${targetDbId} not found.`
    });
  }
  
  // Prepare the AI request
  const aiRequest: AIQueryRequest = {
    userId: req.user.id,
    dbId: targetDbId,
    dbType: database.db_type,
    dbName: database.database_name,
    task,
    options: { visualize }
  };
  
  // Process with AI
  const aiResponse = await AIAgentService.processNaturalLanguageQuery(aiRequest);
  
  if (!aiResponse.success) {
    return res.status(400).json({
      success: false,
      message: aiResponse.error || "AI failed to process the query"
    });
  }
  
  // Set the database as current context
  await ContextService.setCurrentDatabaseContext(req.user.id, targetDbId);
  
  // If AI only generated the query but didn't execute it, execute it now
  if (aiResponse.query && !aiResponse.results) {
    const queryResult = await QueryService.executeQuery(req.user.id, {
      dbId: targetDbId,
      query: aiResponse.query
    });
    
    return res.json({
      success: true,
      query: aiResponse.query,
      explanation: aiResponse.explanation,
      results: queryResult.rows,
      visualizationCode: aiResponse.visualizationCode,
      executionTimeMs: queryResult.executionTimeMs,
      rowCount: queryResult.rowCount,
      message: "Query executed successfully"
    });
  }
  
  // Return the AI response directly if it already contains results
  return res.json({
    success: true,
    ...aiResponse
  });
});

/**
 * Process a WebSocket query
 */
export async function processWebSocketQuery(socket: ws.WebSocket, userId: number, data: any) {
  try {
    aiQueryLogger.info(`Processing WebSocket query for user ${userId}`);
    
    const { task, dbId, visualize = true } = data;
    
    if (!task) {
      sendMessage(socket, {
        type: "error",
        message: "Task description is required"
      });
      return;
    }
    
    // Send acknowledgment
    sendMessage(socket, {
      type: "processing",
      message: "Processing your query..."
    });
    
    // Check for context switching
    const contextSwitch = await ContextService.detectContextSwitch(userId, task);
    if (contextSwitch.switched) {
      sendMessage(socket, {
        type: "contextSwitch",
        message: contextSwitch.message,
        data: { dbId: contextSwitch.dbId }
      });
      return;
    }
    
    // Determine database
    let targetDbId = dbId;
    
    if (!targetDbId) {
      targetDbId = await ContextService.selectDatabaseForQuery(userId, task);
      
      if (!targetDbId) {
        targetDbId = await ContextService.getCurrentDatabaseContext(userId);
      }
      
      if (!targetDbId) {
        sendMessage(socket, {
          type: "error",
          message: "Could not determine which database to use. Please specify a database."
        });
        return;
      }
    }
    
    // Get the database
    const database = await ConnectionsService.getConnectionById(userId, targetDbId);
    if (!database) {
      sendMessage(socket, {
        type: "error",
        message: `Database ${targetDbId} not found.`
      });
      return;
    }
    
    // Process with AI
    const aiRequest: AIQueryRequest = {
        userId,
        dbId: targetDbId,
        dbType: database.db_type,
        dbName: database.database_name,
        task,
        options: { visualize }
      };
      
      const aiResponse = await AIAgentService.processNaturalLanguageQuery(aiRequest);
      
      if (!aiResponse.success) {
        sendMessage(socket, {
          type: "error",
          message: aiResponse.error || "AI failed to process the query"
        });
        return;
      }
      
      // Set database as current context
      await ContextService.setCurrentDatabaseContext(userId, targetDbId);
      
      // Execute query if needed
      if (aiResponse.query && !aiResponse.results) {
        const queryResult = await QueryService.executeQuery(userId, {
          dbId: targetDbId,
          query: aiResponse.query
        });
        
        sendMessage(socket, {
          type: "queryResult",
          data: {
            query: aiResponse.query,
            explanation: aiResponse.explanation,
            results: queryResult.rows,
            visualizationCode: aiResponse.visualizationCode,
            executionTimeMs: queryResult.executionTimeMs,
            rowCount: queryResult.rowCount,
            dbId: targetDbId,
            dbName: database.database_name
          }
        });
      } else {
        // Return AI response directly
        sendMessage(socket, {
          type: "queryResult",
          data: {
            ...aiResponse,
            dbId: targetDbId,
            dbName: database.database_name
          }
        });
      }
    } catch (error) {
      aiQueryLogger.error(`WebSocket query error: ${(error as Error).message}`);
      sendMessage(socket, {
        type: "error",
        message: "Failed to process query",
        error: (error as Error).message
      });
    }
  }
  
  /**
   * Check AI agent health
   */
  export const checkAIAgentHealth = asyncHandler(async (req: AuthRequest, res: Response) => {
    const isHealthy = await AIAgentService.checkHealth();
    
    res.json({
      success: true,
      status: isHealthy ? "available" : "unavailable",
      message: isHealthy ? "AI agent is operational" : "AI agent is currently unavailable"
    });
  });