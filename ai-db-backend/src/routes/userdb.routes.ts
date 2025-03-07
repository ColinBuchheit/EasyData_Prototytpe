// src/routes/userdb.routes.ts
import { Router } from "express";
import {
  addUserDatabase,
  getUserDatabases,
  deleteUserDatabase
} from "../controllers/userdb.controller";
import { AuthRequest, verifyToken } from "../middleware/auth";
import rateLimit from "express-rate-limit";
import logger from "../config/logger";
import { ConnectionManager } from "../services/connectionmanager";
import { fetchCloudCredentials } from "../services/cloudAuth.service";

const router = Router();

const RELATIONAL_DBS = new Set(["postgres", "mysql", "mssql", "sqlite"]);
const NOSQL_DBS = new Set(["mongodb", "firebase", "dynamodb", "couchdb"]);

/**
 * @swagger
 * tags:
 *   name: UserDatabases
 *   description: API for managing user database connections securely
 */

// ✅ Rate limiter to prevent abuse (max 10 requests per 5 minutes)
const databaseLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: { error: "Too many database requests, please try again later." }
});

/**
 * @swagger
 * /api/databases:
 *   post:
 *     summary: Store a new database connection securely with authentication method selection (Supports SQL & NoSQL)
 *     tags: [UserDatabases]
 */
router.post("/databases", verifyToken, databaseLimiter, addUserDatabase);

/**
 * @swagger
 * /api/databases/{user_id}:
 *   get:
 *     summary: Retrieve all database connections for a user (Admins or Self, Supports SQL & NoSQL)
 *     tags: [UserDatabases]
 */
router.get("/databases/:user_id", verifyToken, databaseLimiter, async (req: AuthRequest, res) => {
  const userId = Number(req.params.user_id);

  if (req.user.role !== "admin" && req.user.id !== userId) {
    logger.warn(`🚫 Unauthorized attempt by User ${req.user.id} to access databases of User ${userId}`);
    res.status(403).json({ error: "You are not allowed to view these databases." });
    return;
  }

  logger.info(`✅ User ${req.user.id} accessed database list of User ${userId}`);
  await getUserDatabases(req, res);
});

/**
 * @swagger
 * /api/databases/{id}:
 *   delete:
 *     summary: Delete a database connection (Admins or Owner, Supports SQL & NoSQL)
 *     tags: [UserDatabases]
 */
router.delete("/databases/:id", verifyToken, databaseLimiter, async (req: AuthRequest, res) => {
  const dbId = req.params.id;

  logger.warn(`⚠️ User ${req.user.id} is deleting database ${dbId}`);
  await deleteUserDatabase(req, res);
});

/**
 * @swagger
 * /api/databases/connect:
 *   post:
 *     summary: Connect to a database manually (Supports SQL & NoSQL)
 *     tags: [UserDatabases]
 */
router.post("/databases/connect", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { dbType, cloudProvider } = req.body;
    const userId = req.user.id;

    if (!dbType) {
      res.status(400).json({ message: "❌ Missing database type." });
      return;
    }

    if (!RELATIONAL_DBS.has(dbType) && !NOSQL_DBS.has(dbType)) {
      res.status(400).json({ message: "❌ Unsupported database type." });
      return;
    }

    const credentials = await fetchCloudCredentials(userId, dbType);
    if (!credentials) {
      res.status(401).json({ message: "❌ Unauthorized: No credentials found." });
      return;
    }

    const connectionManager = new ConnectionManager(userId, dbType, credentials);
    await connectionManager.connect(credentials);

    logger.info(`✅ User ${userId} successfully connected to ${dbType}`);
    res.json({ message: "✅ Successfully connected to database." });
  } catch (error) {
    logger.error(`❌ Database connection failed for User ${req.user.id}:`, error);
    res.status(500).json({ message: "Database connection failed.", error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/databases/disconnect:
 *   post:
 *     summary: Disconnect from a database manually (Supports SQL & NoSQL)
 *     tags: [UserDatabases]
 */
router.post("/databases/disconnect", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { dbType } = req.body;
    const userId = req.user.id;

    if (!dbType) {
      res.status(400).json({ message: "❌ Database type is required." });
      return;
    }

    if (!RELATIONAL_DBS.has(dbType) && !NOSQL_DBS.has(dbType)) {
      res.status(400).json({ message: "❌ Unsupported database type." });
      return;
    }

    const connectionManager = new ConnectionManager(userId, dbType, {});
    await connectionManager.disconnect();

    logger.info(`✅ User ${userId} disconnected from ${dbType}`);
    res.json({ message: `✅ Successfully disconnected from ${dbType}` });
  } catch (error) {
    logger.error(`❌ Disconnection failed for User ${req.user.id}:`, error);
    res.status(500).json({ error: "❌ Failed to disconnect from database.", details: (error as Error).message });
  }
});

export default router;
