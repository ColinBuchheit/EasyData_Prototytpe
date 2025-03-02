import { Router } from "express";
import { verifyToken, requireRole, AuthRequest } from "../middleware/auth"; // ✅ Import correct request type
import { createPersistentDBSession, disconnectUserSession } from "../services/dbSession.service";
import { fetchDatabaseSchema } from "../services/ai.service"; // ✅ AI-Agent Handles Schema Retrieval
import logger from "../config/logger";
import { listActiveAISessions } from "../services/ai.service";


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
router.post("/connect", verifyToken, requireRole("admin"), async (req: AuthRequest, res) => { // ✅ Use AuthRequest
  try {
    const { dbType } = req.body;

    if (!dbType) {
      res.status(400).json({ message: "❌ Missing database type." });
      return;
    }

    // ✅ Backend issues a persistent session token instead of credentials
    const session = await createPersistentDBSession(req.user.id, dbType);
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
router.get("/schema", verifyToken, async (req: AuthRequest, res) => { // ✅ Use AuthRequest
  try {
    const { sessionToken } = req.query;

    if (!sessionToken) {
      res.status(400).json({ message: "❌ Session token is required." });
      return;
    }

    // ✅ AI-Agent retrieves schema using session token
    const schema = await fetchDatabaseSchema(sessionToken as string);
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
router.post("/disconnect", verifyToken, requireRole("admin"), async (req: AuthRequest, res) => { // ✅ Use AuthRequest
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      res.status(400).json({ message: "❌ Session token is required." });
      return;
    }

    // ✅ Close session when explicitly requested
    await disconnectUserSession(sessionToken);
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
router.get("/db/sessions", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const sessions = await listActiveAISessions();
    res.json({ activeSessions: sessions });
  } catch (error) {
    res.status(500).json({ error: "❌ Failed to retrieve active AI-Agent sessions." });
  }
});

export default router;
