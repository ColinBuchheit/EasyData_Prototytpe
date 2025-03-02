import { Router } from "express";
import { addUserDatabase, getUserDatabases, deleteUserDatabase } from "../controllers/userdb.controller";
import { verifyToken, AuthRequest } from "../middleware/auth";
import { authorizeRoles } from "../middleware/rbac";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

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

// ✅ Validate database connection input based on authentication type
const validateDatabaseInput = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const { db_type, host, port, username, password, database_name, auth_method } = req.body;

  const validDbTypes = ["postgres", "mysql", "mssql", "sqlite"];
  if (!validDbTypes.includes(db_type)) {
    res.status(400).json({ error: "Invalid database type. Allowed: postgres, mysql, mssql, sqlite." });
    return;
  }

  if (!database_name || typeof database_name !== "string") {
    res.status(400).json({ error: "Invalid database name format." });
    return;
  }

  if (!["session", "stored"].includes(auth_method)) {
    res.status(400).json({ error: "Invalid auth_method. Must be 'session' or 'stored'." });
    return;
  }

  // ✅ If user selects `stored`, ensure credentials are provided
  if (auth_method === "stored") {
    if (!host || typeof host !== "string") {
      res.status(400).json({ error: "Invalid host format." });
      return;
    }

    if (!port || isNaN(Number(port))) {
      res.status(400).json({ error: "Invalid port number." });
      return;
    }

    if (!username || typeof username !== "string") {
      res.status(400).json({ error: "Invalid username format." });
      return;
    }

    if (!password || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters long." });
      return;
    }
  }

  next();
};

/**
 * @swagger
 * /api/databases:
 *   post:
 *     summary: Store a new database connection securely with authentication method selection
 *     tags: [UserDatabases]
 */
router.post("/databases", verifyToken, databaseLimiter, validateDatabaseInput, addUserDatabase);

/**
 * @swagger
 * /api/databases/{user_id}:
 *   get:
 *     summary: Retrieve all database connections for a user (Admins or Self)
 *     tags: [UserDatabases]
 */
router.get("/databases/:user_id", verifyToken, authorizeRoles(["admin", "user"]), databaseLimiter, async (req: AuthRequest, res) => {
  const userId = Number(req.params.user_id); // ✅ Ensure userId is a number

  // ✅ Users can only access their own databases unless they are admin
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

export default router;
