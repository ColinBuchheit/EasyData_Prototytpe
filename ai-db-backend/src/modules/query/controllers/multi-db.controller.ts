// src/modules/query/controllers/multi-db.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { MultiDbService } from "../services/multi-db.service";
import { ConnectionsService } from "../../database/services/connections.service";

const multiDbLogger = createContextLogger("MultiDbController");

/**
 * Execute a query across multiple databases
 */
export const executeMultiDbQuery = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const { task, dbIds } = req.body;
  
  if (!task || typeof task !== "string") {
    return res.status(400).json({ success: false, message: "Task description is required" });
  }
  
  if (!dbIds || !Array.isArray(dbIds) || dbIds.length === 0) {
    // If no dbIds provided, fetch all user's databases
    const userDatabases = await ConnectionsService.getUserConnections(req.user.id);
    if (!userDatabases || userDatabases.length === 0) {
      return res.status(400).json({ success: false, message: "No databases available" });
    }
    
    const allDbIds = userDatabases.map(db => db.id);
    const result = await MultiDbService.handleMultiDatabaseQuery(req.user.id, task, allDbIds);
    return res.json(result);
  }
  
  // Execute with provided dbIds
  const result = await MultiDbService.handleMultiDatabaseQuery(req.user.id, task, dbIds);
  return res.json(result);
});

/**
 * Get multi-database query history
 */
export const getMultiDbQueryHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const history = await MultiDbService.getMultiDbQueryHistory(req.user.id, limit);
  
  res.json({ success: true, history });
});