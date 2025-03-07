// src/middleware/rbac.ts
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { ConnectionManager } from "../services/connectionmanager";
import logger from "../config/logger";

/**
 * Middleware to enforce role-based access control (RBAC).
 */
export const authorizeRoles = (roles: string[], allowAdminOverride = true) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.user.role) {
      logger.warn(`⚠️ Unauthorized request to ${req.originalUrl} - No valid user found.`);
      res.status(401).json({ message: "❌ Unauthorized: You must be logged in." });
      return;
    }

    const { dbType } = req.body; // ✅ Get database type from request
    const userRole = req.user.role.toLowerCase();
    const allowedRoles = roles.map((role) => role.toLowerCase());

    // ✅ Check role-based access per database type (SQL & NoSQL support)
    const hasAccess = await ConnectionManager.checkRoleAccess(req.user.id, dbType, roles);

    if (!hasAccess && !(allowAdminOverride && userRole === "admin")) {
      logger.warn(`🚫 Access Denied: User ${req.user.id} (${userRole}) attempted to access ${req.originalUrl}.`);
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
  const { dbType, dbName } = req.body;

  if (!dbType || !dbName) {
    logger.warn(`🚫 Query Execution Denied: Missing database type or name in request.`);
    res.status(400).json({ message: "❌ Bad Request: Database type and name are required." });
    return;
  }

  // ✅ Support for both SQL & NoSQL active connection checks
  const isConnected = ConnectionManager.isConnected(req.user.id, dbType, dbName);

  if (!isConnected) {
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
    const { id, dbType } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // ✅ Admins can delete any database connection
    if (userRole === "admin") {
      logger.info(`✅ Admin override: User ${userId} is deleting database connection ${id}`);
      return next();
    }

    // ✅ Check database ownership across SQL & NoSQL databases
    const isOwner = await ConnectionManager.checkOwnership(userId, id, dbType);

    if (!isOwner) {
      res.status(403).json({ message: "❌ Forbidden: You do not have permission to delete this database connection." });
      logger.warn(`🚫 Access Denied: User ${userId} tried to delete a database they do not own.`);
      return;
    }

    logger.info(`✅ User ${userId} is allowed to delete their own ${dbType} database connection ${id}`);
    next();
  } catch (error) {
    logger.error(`❌ Error verifying database ownership: ${(error as Error).message}`);
    res.status(500).json({ message: "❌ Failed to verify database ownership." });
  }
};
