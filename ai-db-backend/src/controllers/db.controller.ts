import { Request, Response } from "express";
import { ConnectionManager } from "../services/connectionmanager";
import { AuthRequest } from "../middleware/auth";
import { createPersistentDBSession, disconnectUserSession } from "../services/dbSession.service";
import { fetchDatabaseSchema } from "../services/ai.service";
import logger from "../config/logger";

let connectionManager: ConnectionManager | null = null;

/**
 * Connects to a database by issuing a session token.
 */
export const connectDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user.role !== "admin") {
      res.status(403).json({ message: "❌ Only admins can connect to databases." });
      return;
    }

    if (connectionManager) {
      res.status(400).json({ message: "❌ A database session is already active." });
      return;
    }

    const { dbType } = req.body;
    if (!dbType) {
      res.status(400).json({ message: "❌ Missing database type." });
      return;
    }

    // ✅ Issue a session token instead of credentials
    const session = await createPersistentDBSession(req.user.id, dbType);
    connectionManager = new ConnectionManager(dbType);
    await connectionManager.connect(req.user.id);

    logger.info(`✅ Issued session token for ${dbType} database (Session Token: ${session.sessionToken})`);
    res.json({ message: "✅ Database session started.", sessionToken: session.sessionToken });
  } catch (error) {
    logger.error("❌ Database session initiation failed:", (error as Error).message);
    res.status(500).json({ message: "Database session initiation failed", error: (error as Error).message });
  }
};

/**
 * Retrieves the database schema using AI-Agent session.
 */
export const getDatabaseSchema = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!connectionManager) {
      res.status(400).json({ message: "❌ No active database session." });
      return;
    }

    // ✅ Use getSessionToken() instead of direct access
    const sessionToken = connectionManager.getSessionToken();
    if (!sessionToken) {
      res.status(400).json({ message: "❌ No active session token." });
      return;
    }

    logger.info("📊 Fetching database schema...");
    const schema = await fetchDatabaseSchema(sessionToken);
    res.json({ schema });
  } catch (error) {
    logger.error("❌ Failed to retrieve schema:", (error as Error).message);
    res.status(500).json({ message: "Failed to retrieve schema", error: (error as Error).message });
  }
};

/**
 * Disconnects from the database session.
 */
export const disconnectDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!connectionManager) {
      res.status(400).json({ message: "❌ No active database session to disconnect." });
      return;
    }

    // ✅ Use getSessionToken() instead of direct access
    const sessionToken = connectionManager.getSessionToken();
    if (!sessionToken) {
      res.status(400).json({ message: "❌ No active session token to disconnect." });
      return;
    }

    logger.info("🔌 Disconnecting from database session...");
    await disconnectUserSession(sessionToken);
    connectionManager = null;

    res.json({ message: "✅ Database session closed." });
  } catch (error) {
    logger.error("❌ Database session disconnection failed:", (error as Error).message);
    res.status(500).json({ message: "Database session disconnection failed", error: (error as Error).message });
  }
};
