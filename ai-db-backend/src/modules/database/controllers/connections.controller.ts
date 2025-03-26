// src/modules/database/controllers/connections.controller.ts

import { Request, Response } from "express";
import { ConnectionsService } from "../services/connections.service";
import { SchemaService } from "../services/schema.service";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { createContextLogger } from "../../../config/logger";
import { DatabaseConnectionConfig } from "../models/connection.model";
import { isValidDatabaseType } from "../models/database-types.model";

const connectionsLogger = createContextLogger("ConnectionsController");

/**
 * Create a new database connection
 */
export const createConnection = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const { dbType, host, port, username, password, dbName, connectionName } = req.body;

  if (!dbType || !host || !port || !username || !password || !dbName) {
    return res.status(400).json({ success: false, message: "All database connection details are required." });
  }

  if (!isValidDatabaseType(dbType)) {
    return res.status(400).json({ success: false, message: "Invalid database type." });
  }

  const config: DatabaseConnectionConfig = { 
    dbType, 
    host, 
    port: Number(port), 
    username, 
    password, 
    dbName,
    connectionName 
  };

  // Test the connection first
  const testResult = await ConnectionsService.testConnection(req.user.id, config);
  if (!testResult.success) {
    return res.status(400).json({ 
      success: false, 
      message: "Connection test failed", 
      error: testResult.message 
    });
  }

  const newConnection = await ConnectionsService.createConnection(req.user.id, config);
  
  // Schedule schema analysis in the background
  SchemaService.analyzeAndStoreDbSchema(req.user.id, newConnection.id)
    .then(metadata => {
      if (metadata) {
        connectionsLogger.info(`Schema analysis complete for DB ${newConnection.id}`);
      }
    })
    .catch(err => {
      connectionsLogger.error(`Background schema analysis failed: ${err.message}`);
    });
  
  res.status(201).json({ 
    success: true, 
    message: "Database connection created and schema analysis started.", 
    data: newConnection 
  });
});

/**
 * Get all databases owned by the user
 */
export const getUserConnections = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const connections = await ConnectionsService.getUserConnections(req.user.id);
  res.json({ success: true, data: connections });
});

/**
 * Get details of a specific database connection
 */
export const getConnectionById = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const dbId = Number(req.params.id);

  if (isNaN(dbId)) {
    return res.status(400).json({ success: false, message: "Invalid database ID." });
  }

  const connection = await ConnectionsService.getConnectionById(req.user.id, dbId);
  if (!connection) {
    return res.status(404).json({ success: false, message: "Database connection not found." });
  }

  res.json({ success: true, data: connection });
});

/**
 * Update a database connection's details
 */
export const updateConnection = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const dbId = Number(req.params.id);
  const { dbType, host, port, username, password, dbName, connectionName } = req.body;

  if (isNaN(dbId)) {
    return res.status(400).json({ success: false, message: "Invalid database ID." });
  }

  // Check if connection exists first
  const existingConnection = await ConnectionsService.getConnectionById(req.user.id, dbId);
  if (!existingConnection) {
    return res.status(404).json({ success: false, message: "Database connection not found." });
  }

  const updatedConnection = await ConnectionsService.updateConnection(req.user.id, dbId, { 
    dbType, 
    host, 
    port: port ? Number(port) : undefined, 
    username, 
    password, 
    dbName,
    connectionName
  });

  res.json({ success: true, message: "Database connection updated.", data: updatedConnection });
});

/**
 * Delete a database connection
 */
export const deleteConnection = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const dbId = Number(req.params.id);

  if (isNaN(dbId)) {
    return res.status(400).json({ success: false, message: "Invalid database ID." });
  }

  const success = await ConnectionsService.deleteConnection(req.user.id, dbId);
  if (!success) {
    return res.status(404).json({ success: false, message: "Database connection not found." });
  }

  res.json({ success: true, message: "Database connection deleted." });
});

/**
 * Test a database connection
 */
export const testConnection = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const { dbType, host, port, username, password, dbName } = req.body;

  if (!dbType || !host || !port || !username || !password || !dbName) {
    return res.status(400).json({ success: false, message: "All database connection details are required." });
  }

  if (!isValidDatabaseType(dbType)) {
    return res.status(400).json({ success: false, message: "Invalid database type." });
  }

  const config: DatabaseConnectionConfig = { 
    dbType, 
    host, 
    port: Number(port), 
    username, 
    password, 
    dbName 
  };

  const result = await ConnectionsService.testConnection(req.user.id, config);
  res.json(result);
});

/**
 * Execute a query on a specific user database
 */
export const executeConnectionQuery = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  const connection = await ConnectionsService.getConnectionById(req.user.id, dbId);
  if (!connection) {
    return res.status(404).json({ success: false, message: `Database connection ${dbId} not found.` });
  }

  const result = await ConnectionsService.executeQuery(connection, query);
  res.json({ success: true, result });
});