// src/routes/userdb.routes.ts
import { Router } from "express";
import {
  addUserDatabase,
  getUserDatabases,
  deleteUserDatabase
} from "../controllers/userdb.controller";
import { AuthRequest, verifyToken } from "../middleware/auth"; // ✅ Ensure `AuthRequest` is imported
import { authorizeRoles } from "../middleware/rbac";
import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import logger from "../config/logger";
import { ConnectionManager } from "../services/connectionmanager";
import { fetchCloudCredentials } from "../services/cloudAuth.service"; // ✅ Ensure credentials retrieval


const router = Router();

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
 *     summary: Store a new database connection securely with authentication method selection
 *     tags: [UserDatabases]
 */
router.post("/databases", verifyToken, databaseLimiter, addUserDatabase);

/**
 * @swagger
 * /api/databases/{user_id}:
 *   get:
 *     summary: Retrieve all database connections for a user (Admins or Self)
 *     tags: [UserDatabases]
 */
router.get("/databases/:user_id", verifyToken, authorizeRoles(["admin", "user"]), databaseLimiter, async (req: AuthRequest, res) => {
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
 *     summary: Delete a database connection (Admins or Owner)
 *     tags: [UserDatabases]
 */
router.delete("/databases/:id", verifyToken, authorizeRoles(["admin", "user"]), databaseLimiter, async (req: AuthRequest, res) => {
  const dbId = req.params.id;

  logger.info(`⚠️ User ${req.user.id} is deleting database ${dbId}`);
  await deleteUserDatabase(req, res);
});

/**
 * @swagger
 * /api/databases/connect:
 *   post:
 *     summary: Connect to a database manually
 *     tags: [UserDatabases]
 */
router.post("/connect", verifyToken, async (req: AuthRequest, res) => { // ✅ Fix applied
  try {
    const { dbType, cloudProvider } = req.body;
    const userId = req.user.id; // ✅ Now TypeScript knows `user` exists

    const credentials = await fetchCloudCredentials(userId, dbType, cloudProvider);
    if (!credentials) {
      res.status(401).json({ message: "❌ Unauthorized: No credentials found." });
      return;
    }

    const connectionManager = new ConnectionManager(userId, dbType, credentials);
    await connectionManager.connect(credentials);

    res.json({ message: "✅ Successfully connected to database." });
  } catch (error) {
    res.status(500).json({ message: "Database connection failed.", error });
  }
});




/**
 * @swagger
 * /api/databases/disconnect:
 *   post:
 *     summary: Disconnect from a database manually
 *     tags: [UserDatabases]
 */
router.post("/databases/disconnect", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { db_type } = req.body;
    const userId = req.user.id;

    const connectionManager = ConnectionManager.getInstance(userId, db_type);
    await connectionManager.disconnect();

    logger.info(`✅ User ${userId} disconnected from ${db_type}`);
    res.json({ message: `Successfully disconnected from ${db_type}` });
  } catch (error) {
    logger.error(`❌ Disconnection failed for User ${req.user.id}:`, error);
    res.status(500).json({ error: "Failed to disconnect from database." });
  }
});



export default router;
