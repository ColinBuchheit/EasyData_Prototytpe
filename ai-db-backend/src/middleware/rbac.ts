import { Request, Response, NextFunction } from "express";
import { pool } from "../config/db";
import logger from "../config/logger";
import { AuthRequest } from "../middleware/auth";

/**
 * ✅ Middleware for Role-Based Access Control (RBAC).
 */

/**
 * ✅ Check if a user owns a database before modifying it.
 */
export const checkDatabaseOwnership = async (userId: number, dbId: string, dbType: string): Promise<boolean> => {
  try {
    const result = await pool.query(
      "SELECT owner_id FROM user_databases WHERE id = $1 AND db_type = $2",
      [dbId, dbType]
    );

    // ✅ Ensure proper indexing for both MSSQL and PostgreSQL
    const ownerId = result.rows.length > 0 ? result.rows[0].owner_id : null;

    return ownerId === userId;
  } catch (error) {
    logger.error(`❌ Error checking database ownership: ${(error as Error).message}`);
    return false;
  }
};

/**
 * ✅ Middleware: Ensures user owns the database before modification.
 */
export async function enforceDatabaseOwnership(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const dbId = Number(req.params.id);
    const dbType = req.params.dbType;
    const userId = req.user.id;
    const userRole = req.user.role;

    // ✅ Ensure database ID is valid
    if (isNaN(dbId)) {
      res.status(400).json({ message: "❌ Invalid database ID." });
      return;
    }

    // ✅ Allow Admin Override
    if (userRole === "admin") {
      logger.info(`✅ Admin override: User ${userId} is modifying database ${dbId}`);
      return next();
    }

    // ✅ Call `checkDatabaseOwnership()` and handle the result
    const isOwner = await checkDatabaseOwnership(userId, dbId.toString(), dbType);

    if (!isOwner) {
      logger.warn(`🚫 Access Denied: User ${userId} attempted unauthorized database modification.`);
      res.status(403).json({ message: "❌ Forbidden: You do not have permission to modify this database." });
      return;
    }

    // ✅ Ownership verified, proceed
    next();
  } catch (error) {
    logger.error(`❌ Error verifying database ownership: ${(error as Error).message}`);
    res.status(500).json({ message: "❌ Internal Server Error: Unable to verify ownership." });
  }
}

/**
 * ✅ Middleware to enforce active database connection before executing queries.
 */
export function enforceActiveConnection(req: AuthRequest, res: Response, next: NextFunction): void {
  const { dbType, dbName } = req.body;
  const userId = req.user.id;

  if (!dbType) {
    res.status(400).json({ message: "❌ Missing database type." });
    return;
  }

  // ✅ Check if the user has an active connection (mock logic for now)
  const isConnected = true; // Replace with actual logic to check active DB connections

  if (!isConnected) {
    res.status(403).json({ message: "❌ You do not have an active connection to this database." });
    return;
  }

  logger.info(`✅ User ${userId} has an active ${dbType} database connection. Query execution allowed.`);
  next();
}
