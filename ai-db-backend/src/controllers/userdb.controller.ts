import { Request, Response } from "express";
import { pool } from "../config/db";
import { encrypt, decrypt } from "../utils/encryption"; // ✅ Encryption Utility
import logger from "../config/logger";
import { AuthRequest } from "../middleware/auth";
import { ConnectionManager } from "../services/connectionmanager"; // ✅ Manages user connections
import { fetchCloudCredentials } from "../services/cloudAuth.service"; // ✅ Ensure credentials retrieval


/**
 * Stores a new user database connection securely.
 */
export const addUserDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { user_id, db_type, database_name, host, port, username, password, auth_method } = req.body;

    if (!user_id || !db_type || !database_name || !auth_method) {
      res.status(400).json({ message: "❌ Missing required parameters." });
      return;
    }

    if (!["stored"].includes(auth_method)) {
      res.status(400).json({ message: "❌ Invalid auth_method. Only 'stored' is supported." });
      return;
    }

    // ✅ Encrypt all sensitive data before storing
    const encryptedHost = encrypt(host);
    const encryptedPort = encrypt(port.toString());
    const encryptedUsername = encrypt(username);
    const encryptedPassword = encrypt(password);

    await pool.query(
      `INSERT INTO user_databases (user_id, db_type, database_name, auth_method, encrypted_host, encrypted_port, encrypted_username, encrypted_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [user_id, db_type, database_name, auth_method, encryptedHost, encryptedPort, encryptedUsername, encryptedPassword]
    );

    logger.info(`✅ User database stored securely for user ${user_id}`);
    res.status(201).json({ message: "✅ Database added successfully.", auth_method });
  } catch (error: unknown) {
    logger.error("❌ Error saving database credentials:", (error as Error).message);
    res.status(500).json({ message: "Failed to save database credentials.", details: (error as Error).message });
  }
};

/**
 * Connects the user to a database manually.
 */
export const connectUserDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dbType, cloudProvider } = req.body;
    const userId = req.user.id;

    if (!dbType) {
      res.status(400).json({ message: "❌ Missing database type." });
      return;
    }

    // ✅ Fetch credentials securely
    const credentials = await fetchCloudCredentials(userId, dbType, cloudProvider);
    if (!credentials) {
      res.status(401).json({ message: "❌ Unauthorized: No credentials found." });
      return;
    }

    // ✅ Ensure ConnectionManager gets credentials
    const connectionManager = new ConnectionManager(userId, dbType, credentials);
    await connectionManager.connect(credentials);

    logger.info(`✅ User ${userId} connected to ${dbType}`);
    res.json({ message: `✅ Successfully connected to ${dbType}` });
  } catch (error) {
    const err = error as Error;
    logger.error(`❌ Database connection failed: ${err.message}`);
    res.status(500).json({ message: "Database connection failed", error: err.message });
  }
};

/**
 * Disconnects the user from a database manually.
 */
export const disconnectUserDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { db_type } = req.body;
    const userId = req.user.id;

    if (!db_type) {
      res.status(400).json({ message: "❌ Database type is required." });
      return;
    }

    // ✅ Use Singleton ConnectionManager
    const connectionManager = ConnectionManager.getInstance(userId, db_type);
    await connectionManager.disconnect();

    logger.info(`✅ User ${userId} disconnected from ${db_type}`);
    res.json({ message: `✅ Successfully disconnected from ${db_type}` });
  } catch (error: unknown) {
    logger.error(`❌ Disconnection failed:`, (error as Error).message);
    res.status(500).json({ message: "Failed to disconnect from database.", details: (error as Error).message });
  }
};

/**
 * Retrieves all databases for a user.
 */
export const getUserDatabases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      "SELECT id, db_type, database_name, auth_method FROM user_databases WHERE user_id = $1",
      [userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "❌ No database connections found." });
      return;
    }

    logger.info(`✅ Retrieved databases for user ${userId}.`);
    res.status(200).json(rows);
  } catch (error: unknown) {
    logger.error("❌ Error retrieving user databases:", (error as Error).message);
    res.status(500).json({ message: "Failed to retrieve databases.", details: (error as Error).message });
  }
};

/**
 * Deletes a user database connection (Admins or Database Owners only).
 */
export const deleteUserDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { rows } = await pool.query(
      "SELECT user_id FROM user_databases WHERE id = $1",
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "❌ Database connection not found." });
      return;
    }

    const dbOwnerId = rows[0].user_id;

    if (userId !== dbOwnerId && req.user.role !== "admin") {
      res.status(403).json({ message: "❌ You do not have permission to delete this database connection." });
      return;
    }

    await pool.query("DELETE FROM user_databases WHERE id = $1", [id]);

    logger.info(`✅ Database connection ${id} deleted by user ${userId}`);
    res.status(200).json({ message: "✅ Database connection deleted successfully." });
  } catch (error: unknown) {
    logger.error("❌ Error deleting database connection:", (error as Error).message);
    res.status(500).json({ message: "Failed to delete database connection.", details: (error as Error).message });
  }
};
