// src/routes/db.routes.ts
import { Router } from "express";
import { verifyToken, requireRole, AuthRequest } from "../middleware/auth";
import { createPersistentDBSession, disconnectUserSession } from "../services/dbSession.service";
import { fetchDatabaseSchema, getSchemaForAI, listActiveAISessions } from "../services/ai.service";
import logger from "../config/logger";

const router = Router();

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
 *     summary: Issue a persistent database session token
 *     tags: [Database]
 */
router.post("/connect", verifyToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
  try {
    const { dbType } = req.body;
    const validDbTypes = ["postgres", "mysql", "mssql", "sqlite"];

    if (!dbType || !validDbTypes.includes(dbType)) {
      res.status(400).json({ message: "❌ Invalid or missing database type." });
      return;
    }

    const session = await createPersistentDBSession(req.user.id, dbType);

    logger.info(`✅ Database session created for User ${req.user.id} (${dbType})`);
    logger.info(`🔄 Notifying AI-Agent of schema update for User ${req.user.id} (${dbType})`);

    await getSchemaForAI(req.user.id, dbType);

    res.json({ message: "✅ Database session issued.", sessionToken: session.sessionToken, expires_in: session.expires_in });
  } catch (error) {
    logger.error("❌ Failed to issue database session:", (error as Error).message);
    res.status(500).json({ message: "Failed to issue database session.", error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/db/schema:
 *   get:
 *     summary: Retrieve database schema via AI-Agent
 *     tags: [Database]
 */
router.get("/schema", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { dbType } = req.query;

    if (!dbType) {
      res.status(400).json({ message: "❌ Database type is required." });
      return;
    }

    const schema = await fetchDatabaseSchema(req.user.id, dbType as string);
    res.json({ schema });
  } catch (error) {
    logger.error("❌ Failed to retrieve schema:", (error as Error).message);
    res.status(500).json({ message: "Failed to retrieve schema.", error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/db/disconnect:
 *   post:
 *     summary: Close a database session
 *     tags: [Database]
 */
router.post("/connect", verifyToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      res.status(400).json({ message: "❌ Session token is required." });
      return;
    }

    await disconnectUserSession(sessionToken);
    logger.info(`✅ Database session closed for sessionToken: ${sessionToken}`);
    res.json({ message: "✅ Database session closed." });
  } catch (error) {
    logger.error("❌ Failed to close database session:", (error as Error).message);
    res.status(500).json({ message: "Failed to close database session.", error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/db/sessions:
 *   get:
 *     summary: Lists all active AI-Agent sessions (Admin-only)
 */
router.post("/connect", verifyToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
  try {
    const sessions = await listActiveAISessions();
    logger.info(`✅ Retrieved ${sessions.length} active AI-Agent sessions`);
    res.json({ activeSessions: sessions });
  } catch (error) {
    logger.error("❌ Failed to retrieve active AI-Agent sessions:", (error as Error).message);
    res.status(500).json({ message: "❌ Failed to retrieve active AI-Agent sessions.", error: (error as Error).message });
  }
});

export default router;
