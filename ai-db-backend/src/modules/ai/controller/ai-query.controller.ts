// src/modules/ai/controller/ai-query.controller.ts

import { Response } from "express";
import * as ws from "ws";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { AIIntegrationService } from "../services/ai-integration.service";
import { ContextService } from '../../query/services/context.service';
import { ConnectionsService } from "../../database/services/connections.service";
import { QueryService } from '../../query/services/query.service';
import { AIQueryRequest, NaturalLanguageQueryRequest } from '../../query/models/query.model';
import { sendMessage } from '../../query/middleware/websocket.middleware';

const aiQueryLogger = createContextLogger("AIQueryController");

/**
 * Process a natural language query and execute the resulting SQL
 */
export const processNaturalLanguageQuery = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const { task, dbId: requestDbId, visualize = true }: NaturalLanguageQueryRequest = req.body;
  
  if (!task || typeof task !== "string") {
    return res.status(400).json({ success: false, message: "Task description is required" });
  }
  
  // First check for explicit context switching
  const contextSwitch = await ContextService.detectContextSwitch(req.user.id, task);
  if (contextSwitch.switched && contextSwitch.dbId !== undefined) {
    return res.json({
      success: true,
      message: contextSwitch.message || "Switched database context",
      dbId: contextSwitch.dbId,
      contextSwitched: true
    });
  }
  
  // Determine which database to use - explicitly handle null and undefined
  let targetDbId = requestDbId;
  
  // If no dbId provided, detect from query or use current context
  if (targetDbId === undefined) {
    const selectedDbId = await ContextService.selectDatabaseForQuery(req.user.id, task);
    // Use null coalescing operator to explicitly convert null to undefined
    targetDbId = selectedDbId ?? undefined;
    
    if (targetDbId === undefined) {
      const currentDbId = await ContextService.getCurrentDatabaseContext(req.user.id);
      targetDbId = currentDbId ?? undefined;
    }
    
    if (targetDbId === undefined) {
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

  // Check if we have a cached response for this task
  const cachedResponse = await AIIntegrationService.getCachedQueryResponse(req.user.id, task);
  if (cachedResponse && !req.query.refresh) {
    aiQueryLogger.info(`Using cached response for task: ${task.substring(0, 50)}...`);

    // Set the database as current context
    await ContextService.setCurrentDatabaseContext(req.user.id, targetDbId);
    
    // Execute the cached query if needed
    if (cachedResponse.query && !cachedResponse.results) {
      const queryResult = await QueryService.executeQuery(req.user.id, {
        dbId: targetDbId,
        query: cachedResponse.query
      });
      
      return res.json({
        success: true,
        query: cachedResponse.query,
        explanation: cachedResponse.explanation,
        results: queryResult.rows || [],
        visualizationCode: cachedResponse.visualizationCode,
        executionTimeMs: queryResult.executionTimeMs || 0,
        rowCount: queryResult.rowCount || 0,
        message: "Query executed successfully (cached)",
        cached: true
      });
    }
    
    // Fix for duplicate 'success' property by destructuring cachedResponse 
    // and then adding the success property separately
    const { success, ...restOfResponse } = cachedResponse;
    return res.json({
      success: true,
      ...restOfResponse,
      cached: true
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
  
  // Process with AI Integration Service
  const aiResponse = await AIIntegrationService.processQuery(aiRequest);
  
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
      results: queryResult.rows || [],
      visualizationCode: aiResponse.visualizationCode,
      executionTimeMs: queryResult.executionTimeMs || 0,
      rowCount: queryResult.rowCount || 0,
      message: "Query executed successfully"
    });
  }
  
  // Fix for duplicate 'success' property
  const { success, ...restOfAiResponse } = aiResponse;
  // Return the AI response directly if it already contains results
  return res.json({
    success: true,
    ...restOfAiResponse
  });
});

/**
 * Send progress update to client via WebSocket
 */
function sendProgressUpdate(socket: ws.WebSocket, type: string, message: string, details?: any) {
  sendMessage(socket, {
    type: "progressUpdate",
    data: {
      type,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Process a WebSocket query
 */
export async function processWebSocketQuery(socket: ws.WebSocket, userId: number, data: any) {
  try {
    aiQueryLogger.info(`Processing WebSocket query for user ${userId}`);
    
    const { task, dbId: requestDbId, visualize = true } = data;
    
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
    
    // First progress update
    sendProgressUpdate(socket, "thinking", "Analyzing your question...");
    
    // Check for context switching
    sendProgressUpdate(socket, "decision", "Checking if we need to switch databases...");
    const contextSwitch = await ContextService.detectContextSwitch(userId, task);
    if (contextSwitch.switched && contextSwitch.dbId !== undefined) {
      sendMessage(socket, {
        type: "contextSwitch",
        message: contextSwitch.message || "Switched database context",
        data: { dbId: contextSwitch.dbId }
      });
      return;
    }
    
    // Determine database
    let targetDbId = requestDbId;
    
    if (targetDbId === undefined) {
      // Fix for type mismatch
      const selectedDbId = await ContextService.selectDatabaseForQuery(userId, task);
      targetDbId = selectedDbId ?? undefined;
      
      if (targetDbId === undefined) {
        const currentDbId = await ContextService.getCurrentDatabaseContext(userId);
        targetDbId = currentDbId ?? undefined;
      }
      
      if (targetDbId === undefined) {
        sendMessage(socket, {
          type: "error",
          message: "Could not determine which database to use. Please specify a database."
        });
        return;
      }
    }
    
    // Get the database
    sendProgressUpdate(socket, "decision", `Connecting to database...`);
    const database = await ConnectionsService.getConnectionById(userId, targetDbId);
    if (!database) {
      sendMessage(socket, {
        type: "error",
        message: `Database ${targetDbId} not found.`
      });
      return;
    }
    
    sendProgressUpdate(socket, "decision", `Connected to ${database.database_name || "database"}`);
    
    // Check for cached response
    sendProgressUpdate(socket, "decision", "Checking if I've answered this question before...");
    const cachedResponse = await AIIntegrationService.getCachedQueryResponse(userId, task);
    if (cachedResponse && !data.refresh) {
      aiQueryLogger.info(`Using cached response for WebSocket task: ${task.substring(0, 50)}...`);
      
      // Set database as current context
      await ContextService.setCurrentDatabaseContext(userId, targetDbId);
      
      // Execute query if needed
      if (cachedResponse.query && !cachedResponse.results) {
        const queryResult = await QueryService.executeQuery(userId, {
          dbId: targetDbId,
          query: cachedResponse.query
        });
        
        sendMessage(socket, {
          type: "queryResult",
          data: {
            query: cachedResponse.query,
            explanation: cachedResponse.explanation,
            results: queryResult.rows || [],
            visualizationCode: cachedResponse.visualizationCode,
            executionTimeMs: queryResult.executionTimeMs || 0,
            rowCount: queryResult.rowCount || 0,
            dbId: targetDbId,
            dbName: database.database_name || "database",
            cached: true
          }
        });
        return;
      }
      
      // Fix for destructuring to avoid duplicate property
      const { success, ...restOfResponse } = cachedResponse;
      sendMessage(socket, {
        type: "queryResult",
        data: {
          ...restOfResponse,
          dbId: targetDbId,
          dbName: database.database_name || "database",
          cached: true
        }
      });
      return;
    }
    
    // Process with AI
    sendProgressUpdate(socket, "schema_analysis", "Analyzing database schema...");
    
    // Short delay to show progress to the user
    await new Promise(resolve => setTimeout(resolve, 800));
    
    sendProgressUpdate(socket, "thinking", "Thinking about how to solve this...");
    
    const aiRequest: AIQueryRequest = {
      userId,
      dbId: targetDbId,
      dbType: database.db_type,
      dbName: database.database_name || "",
      task,
      options: { visualize }
    };
    
    // Short delay to show progress to the user
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    sendProgressUpdate(socket, "query_generation", "Generating SQL query...");
    
    const aiResponse = await AIIntegrationService.processQuery(aiRequest);
    
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
      sendProgressUpdate(socket, "query_execution", "Executing query...", {
        query: aiResponse.query
      });
      
      const queryResult = await QueryService.executeQuery(userId, {
        dbId: targetDbId,
        query: aiResponse.query
      });
      
      sendProgressUpdate(socket, "result_analysis", "Analyzing results...");
      
      // If visualization is enabled
      if (visualize && queryResult.rows && queryResult.rows.length > 0) {
        sendProgressUpdate(socket, "visualization", "Creating visualization...");
      }
      
      sendMessage(socket, {
        type: "queryResult",
        data: {
          query: aiResponse.query,
          explanation: aiResponse.explanation,
          results: queryResult.rows || [],
          visualizationCode: aiResponse.visualizationCode,
          executionTimeMs: queryResult.executionTimeMs || 0,
          rowCount: queryResult.rowCount || 0,
          dbId: targetDbId,
          dbName: database.database_name || "database"
        }
      });
    } else {
      // Fix for destructuring to avoid duplicate property
      const { success, ...restOfResponse } = aiResponse;
      // Return AI response directly
      sendMessage(socket, {
        type: "queryResult",
        data: {
          ...restOfResponse,
          dbId: targetDbId,
          dbName: database.database_name || "database"
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
  const isHealthy = await AIIntegrationService.checkHealth();
  
  res.json({
    success: true,
    status: isHealthy ? "available" : "unavailable",
    message: isHealthy ? "AI agent is operational" : "AI agent is currently unavailable"
  });
});