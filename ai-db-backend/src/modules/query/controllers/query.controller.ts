// src/modules/query/controllers/query.controller.ts

import { Request, Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { QueryService } from "../services/query.service";
import { ContextService } from "../services/context.service";
import { QueryRequest } from "../models/query.model";

const queryLogger = createContextLogger("QueryController");

/**
 * Execute a user query on a specific database
 */
export const executeQuery = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const { dbId, query } = req.body;

  if (!dbId || typeof dbId !== "number") {
    return res.status(400).json({ success: false, message: "Missing or invalid dbId." });
  }

  if (!query || typeof query !== "string") {
    return res.status(400).json({ success: false, message: "Invalid or missing query." });
  }

  const queryRequest: QueryRequest = { dbId, query };
  const result = await QueryService.executeQuery(req.user.id, queryRequest);
  
  res.json(result);
});

/**
 * Get query history for the user
 */
export const getQueryHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const dbId = req.query.dbId ? parseInt(req.query.dbId as string, 10) : undefined;
  
  let history;
  if (dbId) {
    history = await QueryService.getQueryHistoryForDatabase(req.user.id, dbId, limit);
  } else {
    history = await QueryService.getQueryHistory(req.user.id, limit);
  }
  
  res.json({ success: true, history });
});

/**
 * Get current database context for the user
 */
export const getCurrentContext = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const context = await ContextService.getUserContext(req.user.id);
  
  if (!context) {
    return res.status(404).json({
      success: false,
      message: "No database context found"
    });
  }
  
  res.json({
    success: true,
    context
  });
});

/**
 * Explicitly set the current database context
 */
export const setCurrentContext = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const { dbId } = req.body;
  
  if (!dbId || typeof dbId !== "number") {
    return res.status(400).json({ success: false, message: "Valid database ID is required" });
  }
  
  await ContextService.setCurrentDatabaseContext(req.user.id, dbId);
  
  res.json({
    success: true,
    message: "Database context updated",
    dbId
  });
});

/**
 * Detect database from a query without executing it
 */
export const detectQueryDatabase = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const { query } = req.body;
  
  if (!query || typeof query !== "string") {
    return res.status(400).json({ success: false, message: "Valid query text is required" });
  }
  
  // First check for explicit context switch
  const contextSwitch = await ContextService.detectContextSwitch(req.user.id, query);
  if (contextSwitch.switched) {
    return res.json({
      success: true,
      switched: true,
      dbId: contextSwitch.dbId,
      message: contextSwitch.message
    });
  }
  
  // Then try to detect database from query
  const databaseMatches = await ContextService.detectDatabaseFromQuery(req.user.id, query);
  
  if (!databaseMatches || databaseMatches.length === 0) {
    const currentDbId = await ContextService.getCurrentDatabaseContext(req.user.id);
    
    return res.json({
      success: true,
      detected: false,
      currentDbId,
      message: "Could not detect database from query. Using current context."
    });
  }
  
  return res.json({
    success: true,
    detected: true,
    matches: databaseMatches,
    recommendedDbId: databaseMatches[0].dbId,
    confidence: databaseMatches[0].confidence,
    reason: databaseMatches[0].reason
  });
});