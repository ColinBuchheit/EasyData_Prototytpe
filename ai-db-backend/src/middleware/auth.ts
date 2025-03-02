// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { ENV } from "../config/env"; // ✅ Use centralized env loader
import logger from "../config/logger";

if (!ENV.JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not set in environment variables!");
}

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Middleware to verify JWT token for authenticated routes
 */
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      logger.warn("⚠️ Unauthorized access attempt: No token provided");
      res.status(401).json({ message: "❌ No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      logger.warn("⚠️ Unauthorized access attempt: Invalid token format");
      res.status(401).json({ message: "❌ Invalid token format" });
      return;
    }

    jwt.verify(token, ENV.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err instanceof TokenExpiredError) {
          logger.warn("⚠️ Token expired: Reauthentication required.");
          res.status(401).json({ message: "❌ Token expired, please log in again." });
        } else {
          logger.error("❌ Unauthorized: Invalid token", err.message);
          res.status(401).json({ message: "❌ Unauthorized: Invalid token" });
        }
        return;
      }

      req.user = decoded;
      logger.info(`✅ User ${req.user.id} successfully authenticated`);
      next();
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("⚠️ Error verifying token:", err.message);
    res.status(500).json({ message: "⚠️ Internal server error" });
  }
};

/**
 * Middleware to enforce role-based access (RBAC)
 */
export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      logger.warn(`🚫 Access Denied: User ${req.user?.id || "unknown"} attempted restricted action`);
      res.status(403).json({ message: "❌ Forbidden: Insufficient permissions" });
      return;
    }
    logger.info(`✅ Role validation passed: User ${req.user.id} has role ${req.user.role}`);
    next();
  };
};

/**
 * Middleware to verify backend-to-AI-Agent communication using `BACKEND_SECRET`
 */
export const verifyBackendRequest = (req: Request, res: Response, next: NextFunction): void => {
  const requestSecret = req.headers["request_secret"] as string;

  if (!requestSecret || requestSecret !== ENV.BACKEND_SECRET) {
    logger.warn("⚠️ Unauthorized backend request detected");
    res.status(403).json({ message: "❌ Unauthorized: Backend secret invalid" });
    return;
  }

  logger.info("✅ Backend request authenticated successfully");
  next();
};
