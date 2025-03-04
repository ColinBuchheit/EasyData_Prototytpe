// src/middleware/rbac.ts
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { ConnectionManager } from "../services/connectionmanager";
import { pool } from "../config/db";
import logger from "../config/logger";

/**
 * Middleware to enforce role-based access control (RBAC).
 */
export const authorizeRoles = (roles: string[], allowAdminOverride = true) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      logger.warn(`⚠️ Unauthorized request to ${req.originalUrl} - No valid user found.`);
      res.status(401).json({ message: "❌ Unauthorized: You must be logged in." });
      return;
    }

    const userRole = req.user.role.toLowerCase(); // ✅ Ensure case-insensitive role matching
    const allowedRoles = roles.map((role) => role.toLowerCase());

    // ✅ Restrict Admin Override for Certain Roles
    if (allowAdminOverride && userRole === "admin" && !["super-admin"].includes(req.user.role)) {
      logger.info(`✅ Admin override granted for User ${req.user.id} to ${req.originalUrl}`);
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      logger.warn(`🚫 Access Denied: User ${req.user.id} (${userRole}) attempted to access ${req.originalUrl}. Allowed: [${roles.join(", ")}]`);
      res.status(403).json({ message: "❌ Forbidden: Insufficient permissions." });
      return;
    }

    logger.info(`✅ Access granted for User ${req.user.id} (${userRole}) to ${req.originalUrl}`);
    next();
  };
};

/**
 * Middleware to ensure user has an active database connection before executing queries.
 */
export const enforceActiveDatabaseConnection = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const { dbType } = req.body;

  if (!dbType || !ConnectionManager.isConnected(req.user.id, dbType)) {
    logger.warn(`🚫 Query Execution Denied: User ${req.user.id} has no active ${dbType} connection.`);
    res.status(403).json({ message: "❌ Forbidden: No active database connection. Please connect first." });
    return;
  }

  logger.info(`✅ User ${req.user.id} has an active ${dbType} database connection. Query execution allowed.`);
  next();
};

/**
 * Middleware to restrict database deletion to owners or admins.
 */
export const enforceDatabaseOwnership = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // ✅ Admins can delete any database connection
    if (userRole === "admin") {
      logger.info(`✅ Admin override: User ${userId} is deleting database connection ${id}`);
      return next();
    }

    // ✅ Use optimized query with EXISTS for better performance
    const { rows } = await pool.query("SELECT EXISTS (SELECT 1 FROM user_databases WHERE id = $1 AND user_id = $2)", [id, userId]);

    if (!rows[0].exists) {
      res.status(403).json({ message: "❌ Forbidden: You do not have permission to delete this database connection." });
      logger.warn(`🚫 Access Denied: User ${userId} tried to delete a database they do not own.`);
      return;
    }

    logger.info(`✅ User ${userId} is allowed to delete their own database connection ${id}`);
    next();
  } catch (error) {
    const err = error as Error;
    logger.error(`❌ Error verifying database ownership: ${err.message}`);
    res.status(500).json({ message: "❌ Failed to verify database ownership.", error: err.message });
  }
};
