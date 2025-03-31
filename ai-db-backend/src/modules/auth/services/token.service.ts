// src/modules/auth/services/token.service.ts
import jwt from "jsonwebtoken";
import { ENV } from "../../../config/env";
import { createContextLogger } from "../../../config/logger";
import { getRedisClient } from "../../../config/redis";
import { TokenPayload } from "../models/auth.model";

const tokenLogger = createContextLogger("TokenService");

/**
 * Generate JWT token for user authentication
 */
export const generateToken = (userId: number, role: string): string => {
  return jwt.sign({ userId, role }, ENV.JWT_SECRET, { expiresIn: "1h" });
};

/**
 * Generate refresh token with longer lifetime
 */
export const generateRefreshToken = (userId: number, role: string): string => {
  return jwt.sign({ userId, role, type: "refresh" }, ENV.JWT_SECRET, { expiresIn: "7d" });
};

/**
 * Refresh a JWT token
 */
export const refreshToken = async (oldToken: string): Promise<string | null> => {
  try {
    const redisClient = await getRedisClient();

    // Prevent reuse of blacklisted tokens
    if (await redisClient.get(`blacklist:${oldToken}`)) {
      tokenLogger.warn("Attempted to reuse a revoked token.");
      return null;
    }

    const decoded = jwt.verify(oldToken, ENV.JWT_SECRET) as TokenPayload;
    
    // Check if it's a refresh token
    if (decoded.type !== "refresh") {
      tokenLogger.warn("Attempted to use a non-refresh token for refresh.");
      return null;
    }
    
    return generateToken(decoded.userId, decoded.role);
  } catch (error) {
    tokenLogger.warn(`Failed to refresh token: ${(error as Error).message}`);
    return null;
  }
};

/**
 * Verify and decode JWT token
 */
export const verifyToken = (token: string): TokenPayload | { error: string; expired?: boolean } => {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { error: "Token expired", expired: true };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { error: "Invalid token signature" };
    }
    if (error instanceof jwt.NotBeforeError) {
      return { error: "Token not yet valid" };
    }
    return { error: "Invalid token" };
  }
};

/**
 * Blacklist a token
 */
export const blacklistToken = async (token: string): Promise<boolean> => {
  try {
    const redisClient = await getRedisClient();
    const decoded = jwt.decode(token) as TokenPayload;
    
    if (!decoded) {
      return false;
    }
    
    // Calculate TTL based on token expiration
    const now = Math.floor(Date.now() / 1000);
    const ttl = (decoded.exp || now + 3600) - now;
    
    if (ttl <= 0) {
      // Token already expired, no need to blacklist
      return true;
    }
    
    await redisClient.set(`blacklist:${token}`, "true", "EX", ttl);
    return true;
  } catch (error) {
    tokenLogger.error(`Error blacklisting token: ${(error as Error).message}`);
    return false;
  }
};

/**
 * Generate a password reset token
 */
export const generateResetToken = (userId: number): string => {
  return jwt.sign({ userId, type: "reset" }, ENV.JWT_SECRET, { expiresIn: "15m" });
};

/**
 * Validate a password reset token
 */
export const validateResetToken = (token: string): { userId: number } | { error: string } => {
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    
    // Verify it's a reset token
    if (decoded.type !== "reset") {
      return { error: "Invalid token type" };
    }
    
    return { userId: decoded.userId };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { error: "Reset token has expired" };
    }
    return { error: "Invalid or expired reset token" };
  }
};