// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, TokenExpiredError } from "jsonwebtoken";
import { ENV } from "../config/env";
import logger from "../config/logger";

if (!ENV.JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not set in environment variables!");
}

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Middleware to verify JWT token for authenticated routes.
 */
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    let authHeader = req.headers["authorization"];

    if (Array.isArray(authHeader)) {
      authHeader = authHeader[0]; // ✅ Handle cases where `authorization` is an array
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("⚠️ Unauthorized access attempt: Invalid or missing token.");
      res.status(401).json({ message: "❌ Unauthorized: No valid token provided." });
      return;
    }

    const token = authHeader.split(" ")[1] as string; // ✅ Ensure token is a string

    jwt.verify(token, ENV.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err instanceof TokenExpiredError) {
          logger.warn("⚠️ Token expired: Reauthentication required.");
          res.status(401).json({ 
            message: "❌ Token expired, please log in again.",
            tokenExpired: true // ✅ Allows frontend to prompt for reauthentication
          });
        } else {
          logger.error(`❌ Unauthorized: Invalid token - ${err.message}`);
          res.status(401).json({ message: "❌ Unauthorized: Invalid token" });
        }
        return;
      }

      req.user = decoded;
      logger.info(`✅ User ${req.user.id} successfully authenticated.`);
      next();
    });
  } catch (error: unknown) {
    logger.error(`⚠️ Error verifying token: ${(error as Error).message}`);
    res.status(500).json({ message: "⚠️ Internal server error" });
  }
};

/**
 * Middleware to enforce role-based access (RBAC).
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(403).json({ message: "❌ Forbidden: Insufficient permissions" });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "❌ Unauthorized: Invalid role" });
      return;
    }

    logger.info(`✅ Role validation passed: User ${req.user.id} has role ${req.user.role}`);
    next();
  };
};

export const verifyWebSocketToken = (token: string): number | null => {
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    return decoded?.id ? Number(decoded.id) : null;
  } catch (err) {
    return null;
  }
};

/**
 * Middleware to verify backend-to-AI-Agent communication using `BACKEND_SECRET`.
 */
export const verifyBackendRequest = (req: Request, res: Response, next: NextFunction): void => {
  const normalizedHeaders = Object.keys(req.headers).reduce((acc, key) => {
    acc[key.toLowerCase()] = req.headers[key];
    return acc;
  }, {} as Record<string, string | string[] | undefined>);

  // ✅ Safe Handling of `request_secret`
  let requestSecret: string;

  if (typeof normalizedHeaders["request_secret"] === "string") {
    requestSecret = normalizedHeaders["request_secret"];
  } else if (Array.isArray(normalizedHeaders["request_secret"])) {
    requestSecret = normalizedHeaders["request_secret"][0]; // ✅ Extract first value from array
  } else {
    requestSecret = ""; // ✅ Default to empty string if undefined
  }

  if (requestSecret !== ENV.BACKEND_SECRET) {
    logger.warn("⚠️ Unauthorized backend request detected.");
    res.status(403).json({ message: "❌ Unauthorized: Backend secret invalid" });
    return;
  }

  logger.info("✅ Backend request authenticated successfully");
  next();
};
