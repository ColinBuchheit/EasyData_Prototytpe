import { Router, Request, Response } from "express";
import { ConnectionManager, DBConfig } from "../services/connectionmanager";
import { verifyToken, requireRole } from "../middleware/auth";
import logger from "../config/logger";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
let connectionManager: ConnectionManager | null = null;

/**
 * @swagger
 * tags:
 *   name: Database
 *   description: API for database connection and schema retrieval
 */

/**
 * @swagger
 * /api/db/connect:
 *   post:
 *     summary: Connect to a database (Admin Only)
 *     tags: [Database]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dbType:
 *                 type: string
 *                 enum: [postgres, mysql, mssql, sqlite]
 *               database:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully connected to the database.
 *       400:
 *         description: Missing required parameters.
 *       403:
 *         description: Forbidden (Admins only).
 *       500:
 *         description: Database connection failed.
 */
router.post("/connect", verifyToken, requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
  try {
    const { dbType, database } = req.body;

    if (!dbType || !database) {
      res.status(400).json({ message: "❌ Missing required parameters." });
      return;
    }

    // ✅ Ensure all required DBConfig properties are present
    const dbConfig: DBConfig = {
      dbType,
      database,
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || "default_user",
      password: process.env.DB_PASSWORD || "default_password",
    };

    connectionManager = new ConnectionManager(dbConfig);
    await connectionManager.connect();

    res.json({ message: `✅ Connected to ${dbType} database successfully.` });
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    res.status(500).json({ message: "Database connection failed", error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/db/schema:
 *   get:
 *     summary: Retrieve database schema (Authenticated Users Only)
 *     tags: [Database]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved schema.
 *       400:
 *         description: No active database connection.
 *       500:
 *         description: Failed to retrieve schema.
 */
router.get("/schema", verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!connectionManager) {
      res.status(400).json({ message: "❌ No active database connection." });
      return;
    }

    const schema = await connectionManager.getSchema();
    res.json({ schema });
  } catch (error) {
    logger.error("❌ Failed to retrieve schema:", error);
    res.status(500).json({ message: "Failed to retrieve schema", error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/db/disconnect:
 *   post:
 *     summary: Disconnect from the database (Admin Only)
 *     tags: [Database]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully disconnected from the database.
 *       400:
 *         description: No active database connection.
 *       500:
 *         description: Database disconnection failed.
 */
router.post("/disconnect", verifyToken, requireRole("admin"), async (req: Request, res: Response): Promise<void> => {
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
    res.status(500).json({ message: "Database disconnection failed", error: (error as Error).message });
  }
});

export default router;
