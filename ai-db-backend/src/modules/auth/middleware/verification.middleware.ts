// src/modules/auth/middleware/verification.middleware.ts
import { Request, Response, NextFunction } from "express";
import { createContextLogger } from "../../../config/logger";
import { TokenPayload } from "../models/auth.model";
import { verifyToken } from "../services/token.service";

const authLogger = createContextLogger("AuthMiddleware");

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

/**
 * Middleware to verify JWT token for authenticated routes
 */
export const verifyTokenMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    let authHeader = req.headers["authorization"];

    if (Array.isArray(authHeader)) {
      authHeader = authHeader[0];
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      authLogger.warn("Unauthorized access attempt: Missing or malformed token.");
      res.status(401).json({ success: false, message: "Unauthorized: No valid token provided." });
      return;
    }

    const token = authHeader.split(" ")[1] as string;
    const decoded = verifyToken(token);

    if ("error" in decoded) {
      if (decoded.expired) {
        res.status(401).json({ 
          success: false,
          message: "Token expired, please log in again.",
          tokenExpired: true
        });
      } else {
        res.status(401).json({ success: false, message: "Unauthorized: Invalid token." });
      }
      return;
    }

    req.user = { id: decoded.userId, role: decoded.role };
    next();
  } catch (error) {
    authLogger.error(`Error verifying token: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Verify WebSocket token and return user ID if valid
 */
export const verifyWebSocketToken = (token: string): number | null => {
  const decoded = verifyToken(token);
  if ("error" in decoded) {
    return null;
  }
  return decoded.userId;
};

/**
 * Middleware to verify backend-to-AI-Agent communication
 */
export const verifyBackendRequest = (req: Request, res: Response, next: NextFunction): void => {
  const normalizedHeaders = Object.keys(req.headers).reduce((acc, key) => {
    acc[key.toLowerCase()] = req.headers[key];
    return acc;
  }, {} as Record<string, string | string[] | undefined>);

  let requestSecret: string = "";

  if (typeof normalizedHeaders["request_secret"] === "string") {
    requestSecret = normalizedHeaders["request_secret"];
  } else if (Array.isArray(normalizedHeaders["request_secret"])) {
    requestSecret = normalizedHeaders["request_secret"][0];
  }

  if (requestSecret !== process.env.BACKEND_SECRET) {
    authLogger.warn("Unauthorized backend request detected.");
    res.status(403).json({ success: false, message: "Unauthorized: Backend secret invalid" });
    return;
  }

  authLogger.info("Backend request authenticated successfully");
  next();
};