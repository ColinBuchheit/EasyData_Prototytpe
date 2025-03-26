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
  return jwt.sign({ userId }, ENV.JWT_SECRET, { expiresIn: "15m" });
};

/**
 * Validate a password reset token
 */
export const validateResetToken = (token: string): { userId: number } | { error: string } => {
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as { userId: number };
    return decoded;
  } catch (error) {
    return { error: "Invalid or expired reset token" };
  }
};