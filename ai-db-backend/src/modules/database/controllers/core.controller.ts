// src/modules/database/controllers/core.controller.ts

import { Request, Response } from "express";
import { CoreDatabaseService } from "../services/core.service";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { createContextLogger } from "../../../config/logger";

const dbControllerLogger = createContextLogger("CoreDBController");

/**
 * Connect a user to the AppDB
 */
export const connectDB = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }
  
  const userId = req.user.id;
  const response = await CoreDatabaseService.connectDatabase(userId);
  res.json(response);
});

/**
 * Check if the database is online
 */
export const checkDBHealth = asyncHandler(async (req: Request, res: Response) => {
  const healthStatus = await CoreDatabaseService.checkDatabaseHealth();
  res.json({ 
    success: healthStatus.isHealthy, 
    status: healthStatus.status 
  });
});

/**
 * Disconnect a user from the AppDB
 */
export const disconnectDB = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }
  
  const userId = req.user.id;
  const response = await CoreDatabaseService.disconnectDatabase(userId);
  res.json(response);
});

/**
 * List all tables in the AppDB
 */
export const listTables = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }
  
  const tables = await CoreDatabaseService.fetchTables();
  res.json({ success: true, tables });
});

/**
 * Get the schema of a specific table
 */
export const getTableSchema = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }
  
  const { table } = req.params;
  const schema = await CoreDatabaseService.fetchTableSchema(table);
  res.json({ success: true, schema });
});

/**
 * Execute a query on the AppDB
 */
export const executeQuery = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
    }
    
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, message: "No query provided." });
    }
  
    const result = await CoreDatabaseService.runQuery(query);
    res.json({ success: true, result });
  });