import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ENV } from "../config/env";
import logger from "../config/logger";
import { getRedisClient } from "../config/redis"; // Import Redis client
import { updateUserPasswordById } from "../services/user.service";

/**
 * ✅ AuthService - Handles JWT authentication & password security.
 */
export class AuthService {
  /**
   * ✅ Generate JWT token for user authentication.
   */
  public static generateToken(userId: number, role: string): string {
    return jwt.sign({ userId, role }, ENV.JWT_SECRET, { expiresIn: "1h" });
  }

  /**
   * ✅ Refresh JWT Token
   */
  public static async refreshToken(oldToken: string): Promise<string | null> {
    try {
      const redisClient = await getRedisClient();

      // ❌ Prevent reuse of blacklisted tokens
      if (await redisClient.get(`blacklist:${oldToken}`)) {
        logger.warn("❌ Attempted to reuse a revoked token.");
        return null;
      }

      const decoded: any = jwt.verify(oldToken, ENV.JWT_SECRET);
      return AuthService.generateToken(decoded.userId, decoded.role);
    } catch (error) {
      logger.warn(`❌ Failed to refresh token: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * ✅ Verify and decode JWT token.
   */
  public static verifyToken(token: string): { userId: number; role: string } | { error: string; expired?: boolean } {
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as { userId: number; role: string };
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { error: "Token expired", expired: true };
      }
      return { error: "Invalid token" };
    }
  }

  /**
   * ✅ Generate a Password Reset Token
   */
  public static generateResetToken(userId: number): string {
    return jwt.sign({ userId }, ENV.JWT_SECRET, { expiresIn: "15m" }); // ✅ Short lifespan for security
  }

  /**
   * ✅ Validate and decode password reset token
   */
  public static validateResetToken(token: string): { userId: number } | { error: string } {
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as { userId: number };
      return decoded;
    } catch (error) {
      return { error: "Invalid or expired reset token" };
    }
  }

  /**
   * ✅ Reset the user's password securely
   */
  public static async resetUserPassword(userId: number, email: string, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // ✅ Ensure `email` and `newPassword` are correctly passed
      await updateUserPasswordById(userId, email, "", hashedPassword);

      return true;
    } catch (error) {
      logger.error(`❌ Error resetting password: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * ✅ Securely hash a user's password.
   */
  public static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  /**
   * ✅ Compare raw password with hashed password.
   */
  public static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
}
