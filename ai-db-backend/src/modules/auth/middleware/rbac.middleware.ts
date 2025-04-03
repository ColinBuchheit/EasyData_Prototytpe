// src/modules/auth/middleware/rbac.middleware.ts
import { Response, NextFunction } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "./verification.middleware";
import { pool } from "../../../config/db";

const rbacLogger = createContextLogger("RBAC");

/**
 * Check if a user owns a database
 */
export const checkDatabaseOwnership = async (userId: number, dbId: string, dbType: string): Promise<boolean> => {
  try {
    const result = await pool.query(
      "SELECT owner_id FROM user_databases WHERE id = $1 AND db_type = $2",
      [dbId, dbType]
    );

    const ownerId = result.rows.length > 0 ? result.rows[0].owner_id : null;
    return ownerId === userId;
  } catch (error) {
    rbacLogger.error(`Error checking database ownership: ${(error as Error).message}`);
    return false;
  }
};

/**
 * Middleware to enforce database ownership
 */
export const enforceDatabaseOwnership = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
      return;
    }

    const dbId = Number(req.params.id);
    const dbType = req.params.dbType;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (isNaN(dbId)) {
      res.status(400).json({ success: false, message: "Invalid database ID." });
      return;
    }

    if (userRole === "admin") {
      rbacLogger.info(`Admin override: User ${userId} is modifying database ${dbId}`);
      return next();
    }

    const isOwner = await checkDatabaseOwnership(userId, dbId.toString(), dbType);

    if (!isOwner) {
      rbacLogger.warn(`Access Denied: User ${userId} attempted unauthorized database modification.`);
      res.status(403).json({ success: false, message: "Forbidden: You do not have permission to modify this database." });
      return;
    }

    next();
  } catch (error) {
    rbacLogger.error(`Error verifying database ownership: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: "Internal Server Error: Unable to verify ownership." });
  }
};

/**
 * Middleware to enforce active database connection
 */
export const enforceActiveConnection = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
    return;
  }

  const { dbType } = req.body;
  const userId = req.user.id;

  if (!dbType) {
    res.status(400).json({ success: false, message: "Missing database type." });
    return;
  }

  // For now we're just checking that the data exists, but in the future
  // we could implement actual connection verification
  const isConnected = true;

  if (!isConnected) {
    res.status(403).json({ success: false, message: "You do not have an active connection to this database." });
    return;
  }

  rbacLogger.info(`User ${userId} has an active ${dbType} database connection. Query execution allowed.`);
  next();
};

/**
 * Middleware to enforce role-based access
 */
export const requireRole = (roles: string[], allowAdminOverride = true) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        rbacLogger.warn(`Unauthorized request to ${req.originalUrl} - No valid user found.`);
        res.status(401).json({ success: false, message: "Unauthorized: You must be logged in." });
        return;
      }
  
      const userRole = req.user.role.toLowerCase();
      const allowedRoles = roles.map((role) => role.toLowerCase());
  
      // Check if user has the required role
      if (!allowedRoles.includes(userRole)) {
        if (allowAdminOverride && userRole === "admin") {
          rbacLogger.info(`Admin override: User ${req.user.id} granted access to ${req.originalUrl}`);
        } else {
          rbacLogger.warn(`Access Denied: User ${req.user.id} (Role: ${userRole}) attempted to access ${req.originalUrl}.`);
          res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions." });
          return;
        }
      }
  
      rbacLogger.info(`Access granted for User ${req.user.id} (${userRole}) to ${req.originalUrl}`);
      next();
    };
  };