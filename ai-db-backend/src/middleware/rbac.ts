// src/middleware/rbac.ts
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import logger from "../config/logger";

export const authorizeRoles = (roles: string[], allowAdminOverride = true) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      logger.warn(`⚠️ Unauthorized request to ${req.originalUrl} - No valid user found`);
      res.status(401).json({ message: "Unauthorized: You must be logged in." });
      return;
    }

    const userRole = req.user.role;

    // ✅ Allow admin override if enabled
    if (allowAdminOverride && userRole === "admin") {
      logger.info(`✅ Admin override access granted for ${req.user.id} to ${req.originalUrl}`);
      return next();
    }

    // ✅ Check if user has the required role
    if (!roles.includes(userRole)) {
      logger.warn(`🚫 Access Denied: User ${req.user.id} (${userRole}) tried to access ${req.originalUrl}`);
      res.status(403).json({ message: "Forbidden: You do not have the required permissions." });
      return;
    }

    logger.info(`✅ Access granted for ${req.user.id} (${userRole}) to ${req.originalUrl}`);
    next();
  };
};
