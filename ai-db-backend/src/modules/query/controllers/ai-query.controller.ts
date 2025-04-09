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
import { QueryResult } from "../models/result.model";


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

  const contextSwitch = await ContextService.detectContextSwitch(req.user.id, task);
  if (contextSwitch.switched) {
    return res.json({
      success: true,
      message: contextSwitch.message,
      dbId: contextSwitch.dbId,
      contextSwitched: true
    });
  }

  let targetDbId: number | undefined = dbId;

  if (!targetDbId) {
    const selectedDb = await ContextService.selectDatabaseForQuery(req.user.id, task);
    targetDbId = selectedDb ?? undefined;
    if (!targetDbId) {
      const currentDbContext = await ContextService.getCurrentDatabaseContext(req.user.id);
      targetDbId = currentDbContext ?? undefined;
    }
    if (!targetDbId) {
      return res.status(400).json({
        success: false,
        message: "Could not determine which database to use. Please specify a database."
      });
    }
  }

  const database = await ConnectionsService.getConnectionById(req.user.id, targetDbId);
  if (!database) {
    return res.status(404).json({
      success: false,
      message: `Database ${targetDbId} not found.`
    });
  }

  const aiRequest: AIQueryRequest = {
    userId: req.user.id,
    dbId: targetDbId,
    dbType: database.db_type,
    dbName: database.database_name,
    task,
    options: { visualize }
  };

  const aiResponse = await AIAgentService.processNaturalLanguageQuery(aiRequest);

  if (!aiResponse.success) {
    return res.status(400).json({
      success: false,
      message: aiResponse.error || "AI failed to process the query"
    });
  }

  await ContextService.setCurrentDatabaseContext(req.user.id, targetDbId);

  if (aiResponse.query && !aiResponse.results) {
    const queryResult: QueryResult = await QueryService.executeQuery(req.user.id, {
      dbId: targetDbId,
      query: aiResponse.query
    });

    const executionTime = queryResult.executionTimeMs ?? undefined;
    const rowCount = queryResult.rowCount ?? undefined;


    return res.json({
      ...aiResponse,
      success: true,
      query: aiResponse.query,
      explanation: aiResponse.explanation,
      results: queryResult.rows,
      visualizationCode: aiResponse.visualizationCode,
      executionTimeMs: executionTime,
      rowCount: rowCount,
      message: "Query executed successfully"
    });
  }

  return res.json({
    ...aiResponse,
    success: true
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

    sendMessage(socket, {
      type: "processing",
      message: "Processing your query..."
    });

    const contextSwitch = await ContextService.detectContextSwitch(userId, task);
    if (contextSwitch.switched) {
      sendMessage(socket, {
        type: "contextSwitch",
        message: contextSwitch.message,
        data: { dbId: contextSwitch.dbId }
      });
      return;
    }

    let targetDbId: number | undefined = dbId;

    if (!targetDbId) {
      const selectedDb = await ContextService.selectDatabaseForQuery(userId, task);
      targetDbId = selectedDb ?? undefined;
      if (!targetDbId) {
        const currentDbContext = await ContextService.getCurrentDatabaseContext(userId);
        targetDbId = currentDbContext ?? undefined;
      }
      if (!targetDbId) {
        sendMessage(socket, {
          type: "error",
          message: "Could not determine which database to use. Please specify a database."
        });
        return;
      }
    }

    const database = await ConnectionsService.getConnectionById(userId, targetDbId);
    if (!database) {
      sendMessage(socket, {
        type: "error",
        message: `Database ${targetDbId} not found.`
      });
      return;
    }

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

    await ContextService.setCurrentDatabaseContext(userId, targetDbId);

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
          executionTimeMs: queryResult.executionTimeMs ?? undefined,
          rowCount: queryResult.rowCount ?? undefined,
          dbId: targetDbId,
          dbName: database.database_name
        }
      });
    } else {
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
