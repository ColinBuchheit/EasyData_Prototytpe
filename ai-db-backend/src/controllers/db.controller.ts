import { Request, Response } from "express";
import { ConnectionManager } from "../services/connectionmanager";
import { AuthRequest } from "../middleware/auth";
import { pool } from "../config/db";
import logger from "../config/logger";
import { fetchCloudCredentials } from "../services/cloudAuth.service"; // ✅ Fetch credentials securely


/**
 * Connects the user to a database securely.
 */
export const connectDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dbType, cloudProvider } = req.body;
    const userId = req.user.id;

    if (!dbType) {
      res.status(400).json({ message: "❌ Missing database type." });
      return;
    }

    // ✅ Fetch credentials securely instead of using stored credentials
    const credentials = await fetchCloudCredentials(userId, dbType, "azure"); // ✅ Use Azure instead of AWS

    if (!credentials) {
      res.status(401).json({ message: "❌ Unauthorized: No credentials found." });
      return;
    }

    // ✅ Ensure ConnectionManager is a singleton
    if (ConnectionManager.isConnected(userId, dbType)) {
      res.status(400).json({ message: "❌ You are already connected to a database." });
      return;
    }

    const connectionManager = ConnectionManager.getInstance(userId, dbType);
    await connectionManager.connect(credentials); // ✅ Use fetched credentials

    logger.info(`✅ User ${userId} connected to ${dbType}`);
    res.json({ message: `✅ Successfully connected to ${dbType}` });
  } catch (error) {
    const err = error as Error;
    logger.error(`❌ Database connection failed: ${err.message}`);
    res.status(500).json({ message: "Database connection failed", error: err.message });
  }
};

/**
 * Retrieves the database schema.
 */
export const getDatabaseSchema = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dbType } = req.body;
    const userId = req.user.id;

    if (!dbType) {
      res.status(400).json({ message: "❌ Missing database type." });
      return;
    }

    if (!ConnectionManager.isConnected(userId, dbType)) {
      res.status(400).json({ message: "❌ No active database connection." });
      return;
    }

    logger.info(`📊 Fetching database schema for User ${userId}, DB: ${dbType}`);

    const schemaQuery = `
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = $1
    `;
    const { rows } = await pool.query(schemaQuery, ["public"]);

    res.json({ schema: rows });
  } catch (error) {
    const err = error as Error;
    logger.error(`❌ Failed to retrieve schema: ${err.message}`);
    res.status(500).json({ message: "Failed to retrieve schema", error: err.message });
  }
};

/**
 * Disconnects the user from the database.
 */
export const disconnectDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    // ✅ Retrieve active connection details
    const activeConnections = ConnectionManager.listActiveConnections();
    const activeConnection = activeConnections.find(conn => conn.userId === userId);

    if (!activeConnection) {
      res.status(400).json({ message: "❌ No active database connection to disconnect." });
      return;
    }

    const { dbType } = activeConnection;

    // ✅ Use existing ConnectionManager instance
    const connectionManager = ConnectionManager.getInstance(userId, dbType);
    await connectionManager.disconnect();

    logger.info(`✅ User ${userId} disconnected from ${dbType}.`);
    res.json({ message: "✅ Database session closed." });
  } catch (error) {
    const err = error as Error;
    logger.error(`❌ Database session disconnection failed: ${err.message}`);
    res.status(500).json({ message: "Database session disconnection failed", error: err.message });
  }
};
