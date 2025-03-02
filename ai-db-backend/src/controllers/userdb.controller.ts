import { Request, Response } from "express";
import pool from "../config/db";
import { encrypt, decrypt } from "../utils/encryption"; // ✅ Encryption Utility
import logger from "../config/logger";
import { AuthRequest } from "../middleware/auth";

/**
 * Stores a new user database connection securely based on selected authentication method.
 */
export const addUserDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { user_id, db_type, database_name, host, port, username, password, auth_method } = req.body;

    if (!user_id || !db_type || !database_name || !auth_method) {
      res.status(400).json({ message: "❌ Missing required parameters." });
      return;
    }

    if (!["session", "stored"].includes(auth_method)) {
      res.status(400).json({ message: "❌ Invalid auth_method. Must be 'session' or 'stored'." });
      return;
    }

    let encryptedPassword: string | null = null;

    if (auth_method === "stored") {
      if (!host || !port || !username || !password) {
        res.status(400).json({ message: "❌ Missing database credentials for stored authentication." });
        return;
      }

      encryptedPassword = encrypt(password);
    }

    await pool.query(
      `INSERT INTO user_databases (user_id, db_type, database_name, auth_method, host, port, username, encrypted_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [user_id, db_type, database_name, auth_method, host || null, port || null, username || null, encryptedPassword || null]
    );

    logger.info(`✅ User database stored securely with auth_method: ${auth_method}`);
    res.status(201).json({ message: "✅ Database added successfully.", auth_method });
  } catch (error: unknown) {
    const err = error as Error; // ✅ Fix: Explicitly cast error
    logger.error("❌ Error saving database credentials:", err.message);
    res.status(500).json({ message: "Failed to save database credentials.", details: err.message });
  }
};

/**
 * Retrieves all databases for a user.
 */
export const getUserDatabases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      res.status(400).json({ message: "❌ User ID is required." });
      return;
    }

    const { rows } = await pool.query(
      "SELECT id, db_type, database_name, auth_method FROM user_databases WHERE user_id = $1",
      [user_id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "❌ No database connections found." });
      return;
    }

    logger.info(`✅ Retrieved databases for user ${user_id}.`);
    res.status(200).json(rows);
  } catch (error: unknown) {
    const err = error as Error; // ✅ Fix: Explicitly cast error
    logger.error("❌ Error retrieving user databases:", err.message);
    res.status(500).json({ message: "Failed to retrieve databases.", details: err.message });
  }
};

/**
 * Retrieves a user's stored database password securely (only for `auth_method === "stored"`).
 */
export const getDatabasePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, user_id } = req.params;

    if (!id || !user_id) {
      res.status(400).json({ message: "❌ Database ID and User ID are required." });
      return;
    }

    // ✅ Ensure the database uses `stored` authentication
    const { rows } = await pool.query(
      "SELECT encrypted_password, auth_method FROM user_databases WHERE id = $1 AND user_id = $2",
      [id, user_id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "❌ Database connection not found." });
      return;
    }

    if (rows[0].auth_method !== "stored") {
      res.status(403).json({ message: "❌ This database uses session-based authentication. No stored credentials." });
      return;
    }

    const decryptedPassword = decrypt(rows[0].encrypted_password);

    logger.info(`✅ Retrieved stored password for database ID: ${id}`);
    res.status(200).json({ password: decryptedPassword });
  } catch (error: unknown) {
    const err = error as Error; // ✅ Fix: Explicitly cast error
    logger.error("❌ Error retrieving database password:", err.message);
    res.status(500).json({ message: "Failed to retrieve database password.", details: err.message });
  }
};

/**
 * Deletes a user database connection (Admins or Database Owners only).
 */
export const deleteUserDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      res.status(400).json({ message: "❌ Database ID is required." });
      return;
    }

    // ✅ Check if database exists and who owns it
    const { rows } = await pool.query(
      "SELECT user_id FROM user_databases WHERE id = $1",
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: "❌ Database connection not found." });
      return;
    }

    const dbOwnerId = rows[0].user_id;

    // ✅ Ensure only the database owner or an admin can delete it
    if (userId !== dbOwnerId && req.user.role !== "admin") {
      res.status(403).json({ message: "❌ You do not have permission to delete this database connection." });
      return;
    }

    // ✅ Delete the database connection
    await pool.query("DELETE FROM user_databases WHERE id = $1", [id]);

    logger.info(`✅ Database connection ${id} deleted by user ${userId}`);
    res.status(200).json({ message: "✅ Database connection deleted successfully." });
  } catch (error: unknown) {
    const err = error as Error; // ✅ Explicitly cast error
    logger.error("❌ Error deleting database connection:", err.message);
    res.status(500).json({ message: "Failed to delete database connection.", details: err.message });
  }
};

