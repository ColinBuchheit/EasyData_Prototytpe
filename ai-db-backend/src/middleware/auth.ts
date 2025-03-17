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
      logger.warn("⚠️ Unauthorized access attempt: Missing or malformed token.");
      res.status(401).json({ message: "❌ Unauthorized: No valid token provided." });
      return;
    }

    const token = authHeader.split(" ")[1] as string; // ✅ Ensure token is a string

    jwt.verify(token, ENV.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err instanceof TokenExpiredError) {
          res.status(401).json({ 
            message: "❌ Token expired, please log in again.",
            tokenExpired: true // ✅ Allows frontend to detect expired tokens
          });
        } else {
          res.status(401).json({ message: "❌ Unauthorized: Invalid token." });
        }
        return;
      }

      req.user = { id: (decoded as JwtPayload).userId, role: (decoded as JwtPayload).role };
      next();
    });
  } catch (error: unknown) {
    logger.error(`⚠️ Error verifying token: ${(error as Error).message}`);
    res.status(500).json({ message: "⚠️ Internal server error" });
  }
};

export function authorizeRoles(roles: string[], allowAdminOverride = true) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.user.role) {
      logger.warn(`⚠️ Unauthorized request to ${req.originalUrl} - No valid user found.`);
      res.status(401).json({ message: "❌ Unauthorized: You must be logged in." });
      return;
    }

    const userRole = req.user.role.toLowerCase();
    const allowedRoles = roles.map((role) => role.toLowerCase());

    // ✅ Check if user has the required role
    if (!allowedRoles.includes(userRole)) {
      if (allowAdminOverride && userRole === "admin") {
        logger.info(`✅ Admin override: User ${req.user.id} granted access to ${req.originalUrl}`);
      } else {
        logger.warn(`🚫 Access Denied: User ${req.user.id} (Role: ${userRole}) attempted to access ${req.originalUrl}.`);
        res.status(403).json({ message: "❌ Forbidden: Insufficient permissions." });
        return;
      }
    }

    logger.info(`✅ Access granted for User ${req.user.id} (${userRole}) to ${req.originalUrl}`);
    next();
  };
}

/**
 * Middleware to enforce role-based access (RBAC).
 */
export const requireRole = (roles: string[], allowAdminOverride = true) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(403).json({ message: "❌ Forbidden: Insufficient permissions" });
      return;
    }

    const userRole = req.user.role.toLowerCase();
    const allowedRoles = roles.map((role) => role.toLowerCase());

    // ✅ Admin Override (if allowed)
    if (allowAdminOverride && userRole === "admin") {
      logger.info(`✅ Admin override: User ${req.user.id} granted access to ${req.originalUrl}`);
      next();
      return;
    }

    // ✅ Validate user role
    if (!allowedRoles.includes(userRole)) {
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
    return decoded?.userId ? Number(decoded.userId) : null;
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
  let requestSecret: string = "";

  if (typeof normalizedHeaders["request_secret"] === "string") {
    requestSecret = normalizedHeaders["request_secret"];
  } else if (Array.isArray(normalizedHeaders["request_secret"])) {
    requestSecret = normalizedHeaders["request_secret"][0];
  }

  if (requestSecret !== ENV.BACKEND_SECRET) {
    logger.warn("⚠️ Unauthorized backend request detected.");
    res.status(403).json({ message: "❌ Unauthorized: Backend secret invalid" });
    return;
  }

  logger.info("✅ Backend request authenticated successfully");
  next();
};