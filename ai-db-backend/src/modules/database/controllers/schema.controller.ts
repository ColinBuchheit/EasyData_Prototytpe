// src/modules/database/controllers/schema.controller.ts

import { Request, Response } from "express";
import { SchemaService } from "../services/schema.service";
import { ConnectionsService } from "../services/connections.service";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { createContextLogger } from "../../../config/logger";
import { isValidDatabaseType } from "../models/database-types.model";

const schemaControllerLogger = createContextLogger("SchemaController");

/**
 * Get all tables for a database type
 */
export const getAllTables = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const dbType = req.query.dbType as string;

  if (!dbType || !isValidDatabaseType(dbType)) {
    return res.status(400).json({ success: false, message: "Missing or invalid database type." });
  }

  const tables = await SchemaService.fetchAllTables(dbType);
  res.json({ success: true, tables });
});

/**
 * Get the schema for a specific table
 */
export const getTableSchema = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const dbType = req.query.dbType as string;
  const tableName = req.params.table;

  if (!dbType || !isValidDatabaseType(dbType) || !tableName) {
    return res.status(400).json({ success: false, message: "Missing database type or table name." });
  }

  const schema = await SchemaService.fetchTableSchema(dbType, tableName);
  res.json({ success: true, schema });
});

/**
 * Validate a query against the schema
 */
export const validateQuerySchema = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const { dbType, query } = req.body;

  if (!dbType || !isValidDatabaseType(dbType) || !query) {
    return res.status(400).json({ success: false, message: "Missing database type or query." });
  }

  const validationResult = await SchemaService.validateQueryAgainstSchema(query, dbType);
  
  if (!validationResult.isValid) {
    return res.status(400).json({ 
      success: false, 
      message: "Query validation failed.", 
      error: validationResult.message,
      invalidTables: validationResult.invalidTables 
    });
  }

  res.json({ success: true, message: "Query is valid." });
});

/**
 * Get schema metadata for a database
 */
export const getDatabaseMetadata = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const dbId = Number(req.params.id);

  if (isNaN(dbId)) {
    return res.status(400).json({ success: false, message: "Invalid database ID." });
  }

  // First check if the DB exists and user has access
  const connection = await ConnectionsService.getConnectionById(req.user.id, dbId);
  if (!connection) {
    return res.status(404).json({ success: false, message: "Database not found." });
  }

  // Get existing metadata or analyze
  let metadata = await SchemaService.getDbMetadata(req.user.id, dbId);
  
  // If no metadata exists, trigger analysis
  if (!metadata) {
    metadata = await SchemaService.analyzeAndStoreDbSchema(req.user.id, dbId);
    if (!metadata) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to analyze database schema." 
      });
    }
  }

  res.json({ success: true, data: metadata });
});

/**
 * Refresh schema metadata for a database
 */
export const refreshDatabaseMetadata = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const dbId = Number(req.params.id);

  if (isNaN(dbId)) {
    return res.status(400).json({ success: false, message: "Invalid database ID." });
  }

  const connection = await ConnectionsService.getConnectionById(req.user.id, dbId);
  if (!connection) {
    return res.status(404).json({ success: false, message: "Database not found." });
  }

  const metadata = await SchemaService.analyzeAndStoreDbSchema(req.user.id, dbId);
  
  if (!metadata) {
    return res.status(500).json({ 
      success: false, 
      message: "Failed to analyze database schema." 
    });
  }

  res.json({ success: true, message: "Database schema refreshed.", data: metadata });
});