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

// Import FallbackService for basic queries when AI is unavailable
import { FallbackService } from '../../query/services/fallback.service';

const aiQueryLogger = createContextLogger("AIQueryController");

/**
 * Process a natural language query and execute the resulting SQL
 */
export const processNaturalLanguageQuery = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const { task, dbId: requestDbId, visualize = true, refresh = false }: NaturalLanguageQueryRequest = req.body;
  
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

  // Check AI agent health before proceeding
  const aiHealthy = await AIIntegrationService.checkHealth();
  
  if (!aiHealthy) {
    // Try to use the fallback service for simple requests
    if (targetDbId !== undefined) {
      try {
        const fallbackResult = await FallbackService.processBasicQuery(req.user.id, targetDbId, task);
        if (fallbackResult.success) {
          return res.json({
            ...fallbackResult,
            usingFallback: true,
            message: fallbackResult.message || "The AI service is currently unavailable. Using a fallback simple query."
          });
        }
      } catch (error) {
        // If fallback fails, continue to return the standard error
        aiQueryLogger.error(`Fallback service failed: ${(error as Error).message}`);
      }
    }
    
    return res.status(503).json({
      success: false,
      message: "AI service is currently unavailable. Please try again later.",
      serviceStatus: "unavailable"
    });
  }

  // Check if we have a cached response for this task
  if (!refresh) {
    const cachedResponse = await AIIntegrationService.getCachedQueryResponse(req.user.id, task);
    if (cachedResponse) {
      aiQueryLogger.info(`Using cached response for task: ${task.substring(0, 50)}...`);

      // Set the database as current context
      await ContextService.setCurrentDatabaseContext(req.user.id, targetDbId);
      
      // Execute the cached query if needed
      if (cachedResponse.query && !cachedResponse.results) {
        // Execute the query
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
  }
  
  // Prepare the AI request
  const aiRequest: AIQueryRequest = {
    userId: req.user.id,
    dbId: targetDbId,
    dbType: database.db_type,
    dbName: database.database_name,
    task,
    options: { visualize, refresh }
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
    // Execute the query
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
    
    const { task, dbId: requestDbId, visualize = true, refresh = false } = data;
    
    if (!task) {
      sendMessage(socket, {
        type: "error",
        message: "Task description is required",
        errorCode: "MISSING_TASK"
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
      sendProgressUpdate(socket, "decision", "Determining which database to use...");
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
          message: "Could not determine which database to use. Please specify a database.",
          errorCode: "DB_UNDEFINED"
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
        message: `Database ${targetDbId} not found.`,
        errorCode: "DB_NOT_FOUND"
      });
      return;
    }
    
    sendProgressUpdate(socket, "decision", `Connected to ${database.database_name || "database"}`);
    
    // Check AI agent health before proceeding
    sendProgressUpdate(socket, "system_check", "Checking AI service availability...");
    const wsAiHealthy = await AIIntegrationService.checkHealth();
    
    if (!wsAiHealthy) {
      // Try to use the fallback service for simple requests
      sendProgressUpdate(socket, "fallback", "Using fallback query generation...");
      try {
        const fallbackResult = await FallbackService.processBasicQuery(userId, targetDbId, task);
        if (fallbackResult.success) {
          sendMessage(socket, {
            type: "queryResult",
            data: {
              ...fallbackResult,
              dbId: targetDbId,
              dbName: database.database_name || "database",
              usingFallback: true,
              message: fallbackResult.message || "The AI service is currently unavailable. Using a fallback simple query."
            }
          });
          return;
        }
      } catch (error) {
        // If fallback fails, continue to return the standard error
        aiQueryLogger.error(`Fallback service failed: ${(error as Error).message}`);
      }

      sendMessage(socket, {
        type: "error",
        message: "AI service is currently unavailable. Please try again later.",
        errorCode: "AI_UNAVAILABLE"
      });
      return;
    }
    
    // Check for cached response
    if (!refresh) {
      sendProgressUpdate(socket, "decision", "Checking if I've answered this question before...");
      const cachedResponse = await AIIntegrationService.getCachedQueryResponse(userId, task);
      
      if (cachedResponse) {
        aiQueryLogger.info(`Using cached response for WebSocket task: ${task.substring(0, 50)}...`);
        
        // Set database as current context
        await ContextService.setCurrentDatabaseContext(userId, targetDbId);
        
        // Execute query if needed
        if (cachedResponse.query && !cachedResponse.results) {
          sendProgressUpdate(socket, "query_execution", "Executing cached query...", {
            query: cachedResponse.query
          });
          
          // Execute the query
          const queryResult = await QueryService.executeQuery(userId, {
            dbId: targetDbId,
            query: cachedResponse.query
          });
          
          sendProgressUpdate(socket, "result_analysis", "Analysis complete (from cache)");
          
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
        
        sendProgressUpdate(socket, "result_analysis", "Analysis complete (from cache)");
        
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
      options: { visualize, refresh }
    };
    
    // Short delay to show progress to the user
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    sendProgressUpdate(socket, "query_generation", "Generating SQL query...");
    
    // Get AI response
    const processedResponse = await AIIntegrationService.processQuery(aiRequest);
    
    if (!processedResponse.success) {
      sendMessage(socket, {
        type: "error",
        message: processedResponse.error || "AI failed to process the query",
        errorCode: "AI_PROCESSING_FAILED"
      });
      return;
    }
    
    // Set database as current context
    await ContextService.setCurrentDatabaseContext(userId, targetDbId);
    
    // Execute query if needed
    if (processedResponse.query && !processedResponse.results) {
      sendProgressUpdate(socket, "query_execution", "Executing query...", {
        query: processedResponse.query
      });
      
      // Execute the query
      const queryResult = await QueryService.executeQuery(userId, {
        dbId: targetDbId,
        query: processedResponse.query
      });
      
      sendProgressUpdate(socket, "result_analysis", "Analyzing results...");
      
      // If visualization is enabled
      if (visualize && queryResult.rows && queryResult.rows.length > 0) {
        sendProgressUpdate(socket, "visualization", "Creating visualization...");
      }
      
      sendMessage(socket, {
        type: "queryResult",
        data: {
          query: processedResponse.query,
          explanation: processedResponse.explanation,
          results: queryResult.rows || [],
          visualizationCode: processedResponse.visualizationCode,
          executionTimeMs: queryResult.executionTimeMs || 0,
          rowCount: queryResult.rowCount || 0,
          dbId: targetDbId,
          dbName: database.database_name || "database"
        }
      });
    } else {
      // Fix for destructuring to avoid duplicate property
      const { success, ...restOfResponse } = processedResponse;
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
    
    // Improved error reporting with specific error types
    if ((error as Error).message.includes("AI agent endpoint not found")) {
      sendMessage(socket, {
        type: "error",
        message: "AI service connection issue. Please try again later or contact support.",
        error: "Configuration error: AI service not available",
        errorCode: "AI_ENDPOINT_MISSING"
      });
    } else if ((error as Error).message.includes("timeout")) {
      sendMessage(socket, {
        type: "error",
        message: "AI service is taking too long to respond. Please try a simpler query.",
        error: "Request timed out",
        errorCode: "AI_TIMEOUT"
      });
    } else if ((error as Error).message.includes("connection refused")) {
      sendMessage(socket, {
        type: "error",
        message: "Cannot connect to AI service. Please try again later.",
        error: "Connection refused",
        errorCode: "AI_CONNECTION_REFUSED"
      });
    } else {
      sendMessage(socket, {
        type: "error",
        message: "Failed to process query",
        error: (error as Error).message,
        errorCode: "GENERAL_ERROR"
      });
    }
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
