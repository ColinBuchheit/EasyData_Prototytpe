// src/modules/auth/middleware/verification.middleware.ts
import { Request, Response, NextFunction } from "express";
import { createContextLogger } from "../../../config/logger";
import { TokenPayload } from "../models/auth.model";
import { verifyToken } from "../services/token.service";
import { getRedisClient } from "../../../config/redis";

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
export const verifyTokenMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
    
    // Check if token is blacklisted
    try {
      const redisClient = await getRedisClient();
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      
      if (isBlacklisted) {
        authLogger.warn("Attempted use of blacklisted token");
        res.status(401).json({ 
          success: false, 
          message: "Token has been revoked. Please log in again." 
        });
        return;
      }
    } catch (redisError) {
      // If Redis check fails, log but continue - better to allow a potentially
      // valid token than to block all requests if Redis is down
      authLogger.error(`Redis blacklist check failed: ${(redisError as Error).message}`);
    }
    
    const decoded = verifyToken(token);

    if ("error" in decoded) {
      if (decoded.expired) {
        res.status(401).json({ 
          success: false,
          message: "Token expired. Please log in again or use refresh token.",
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
export const verifyWebSocketToken = async (token: string): Promise<number | null> => {
  try {
    // Check if token is blacklisted
    const redisClient = await getRedisClient();
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    
    if (isBlacklisted) {
      authLogger.warn("Attempted use of blacklisted token for WebSocket");
      return null;
    }
    
    const decoded = verifyToken(token);
    if ("error" in decoded) {
      return null;
    }
    return decoded.userId;
  } catch (error) {
    authLogger.error(`WebSocket token verification error: ${(error as Error).message}`);
    return null;
  }
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