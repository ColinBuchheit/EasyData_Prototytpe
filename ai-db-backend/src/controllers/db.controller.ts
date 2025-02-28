import { Request, Response } from "express";
import { ConnectionManager } from "../services/connectionmanager";
import { AuthRequest } from "../middleware/auth";
import logger from "../config/logger";
import dotenv from "dotenv";

dotenv.config();

let connectionManager: ConnectionManager | null = null;

/**
 * Connects to a database.
 */
export const connectDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user.role !== "admin") {
      res.status(403).json({ message: "❌ Only admins can connect to databases." });
      return;
    }

    if (connectionManager) {
      res.status(400).json({ message: "❌ A database is already connected." });
      return;
    }

    // ✅ Ensure `dbType` matches expected types
    const validDbTypes = ["postgres", "mysql", "mssql", "sqlite"] as const;
    const dbType = (process.env.DB_TYPE || "postgres") as typeof validDbTypes[number];

    if (!validDbTypes.includes(dbType)) {
      res.status(400).json({ message: "❌ Invalid database type." });
      return;
    }

    // ✅ Use predefined DB credentials from `.env`
    const dbConfig = {
      dbType,
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || "admin",
      password: process.env.DB_PASSWORD || "securepassword",
      database: process.env.DB_DATABASE || "mydatabase",
    };

    connectionManager = new ConnectionManager(dbConfig);
    await connectionManager.connect();

    res.json({ message: `✅ Connected to ${dbConfig.dbType} database successfully.` });
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    res.status(500).json({ message: "Database connection failed" });
  }
};

/**
 * Retrieves the database schema.
 */
export const getDatabaseSchema = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!connectionManager) {
      res.status(400).json({ message: "❌ No active database connection." });
      return;
    }

    const schema = await connectionManager.getSchema();
    res.json({ schema });
  } catch (error) {
    logger.error("❌ Failed to retrieve schema:", error);
    res.status(500).json({ message: "Failed to retrieve schema" });
  }
};

/**
 * Disconnects from the database.
 */
export const disconnectDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!connectionManager) {
      res.status(400).json({ message: "❌ No active database connection to disconnect." });
      return;
    }

    await connectionManager.disconnect();
    connectionManager = null;
    res.json({ message: "✅ Database disconnected successfully." });
  } catch (error) {
    logger.error("❌ Database disconnection failed:", error);
    res.status(500).json({ message: "Database disconnection failed" });
  }
};
