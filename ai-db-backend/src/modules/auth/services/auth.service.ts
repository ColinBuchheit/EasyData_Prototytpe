// src/modules/auth/services/auth.service.ts
import { createContextLogger } from "../../../config/logger";
import { UserService } from "../../user/services/user.service";
import { AuthResponse } from "../models/auth.model";
import { comparePassword, hashPassword, validatePasswordStrength } from "./password.service";
import { generateToken, generateRefreshToken } from "./token.service";
import { getRedisClient } from "../../../config/redis";
import { AuthEmailService } from "./email.service";

const authLogger = createContextLogger("AuthService");

export class AuthService {
  /**
   * Authenticate a user
   */
  public static async login(username: string, password: string): Promise<AuthResponse> {
    const startTime = Date.now();
    
    try {
      const user = await UserService.getUserByUsername(username);
      if (!user) {
        await this.trackAuthPerformance(startTime, "login_failure");
        return { success: false, message: "Invalid credentials" };
      }

      const passwordValid = await comparePassword(password, user.password_hash);
      if (!passwordValid) {
        authLogger.warn(`Failed login attempt for user: ${username}`);
        await this.trackAuthPerformance(startTime, "login_failure");
        return { success: false, message: "Invalid credentials" };
      }

      // Check if user is active
      if (user.status !== "active") {
        authLogger.warn(`Login attempt for inactive user: ${username}`);
        await this.trackAuthPerformance(startTime, "login_failure");
        return { success: false, message: "Account is not active. Please contact support." };
      }

      // Generate tokens
      const accessToken = generateToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id, user.role);
      
      // Store refresh token in Redis
      const redisClient = await getRedisClient();
      await redisClient.set(
        `refresh:${user.id}:${refreshToken.substring(refreshToken.length - 10)}`, 
        refreshToken,
        "EX",
        7 * 24 * 60 * 60 // 7 days
      );
      
      await this.trackAuthPerformance(startTime, "login_success");
      
      return {
        success: true,
        message: "Authentication successful",
        token: accessToken,
        refreshToken, // Include refresh token in response
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      };
    } catch (error) {
      authLogger.error(`Error logging in: ${(error as Error).message}`);
      await this.trackAuthPerformance(startTime, "login_error");
      return { success: false, message: "Authentication failed" };
    }
  }

  /**
   * Reset a user's password
   */
  public static async resetPassword(userId: number, email: string, newPassword: string): Promise<boolean> {
    try {
      const passwordCheck = validatePasswordStrength(newPassword);
      if (!passwordCheck.valid) {
        authLogger.warn(`Password reset failed for user ${userId}: ${passwordCheck.message}`);
        return false;
      }

      const hashedPassword = await hashPassword(newPassword);
      
      // Calling updatePassword with the correct parameters based on the error messages
      // The method now expects 4 arguments: userId, currentPassword, newPassword, isReset
      const success = await UserService.updatePassword(userId, "", hashedPassword, true);
      
      if (success) {
        // Clear any existing refresh tokens for this user
        try {
          const redisClient = await getRedisClient();
          const keys = await redisClient.keys(`refresh:${userId}:*`);
          if (keys.length > 0) {
            await Promise.all(keys.map((key: string) => redisClient.del(key)));
            authLogger.info(`Cleared ${keys.length} refresh tokens for user ${userId} after password reset`);
          }
        } catch (redisError) {
          authLogger.error(`Error clearing refresh tokens: ${(redisError as Error).message}`);
          // Non-critical, continue
        }
      }
      
      return success;
    } catch (error) {
      authLogger.error(`Error resetting password: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Change a user's password
   */
  public static async changePassword(
    userId: number, 
    email: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<boolean> {
    try {
      // Validate password strength first
      const passwordCheck = validatePasswordStrength(newPassword);
      if (!passwordCheck.valid) {
        return false;
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Calling updatePassword with the correct parameters based on the error messages
      // The last parameter should be false or omitted since this is not a reset
      const success = await UserService.updatePassword(userId, currentPassword, hashedPassword, false);
      
      if (success) {
        // Clear any existing refresh tokens for this user
        try {
          const redisClient = await getRedisClient();
          const keys = await redisClient.keys(`refresh:${userId}:*`);
          if (keys.length > 0) {
            await Promise.all(keys.map((key: string) => redisClient.del(key)));
            authLogger.info(`Cleared ${keys.length} refresh tokens for user ${userId} after password change`);
          }
          
          // Send password changed confirmation email
          try {
            const user = await UserService.getUserById(userId);
            if (user && user.email) {
              await AuthEmailService.sendPasswordChangedEmail(user.email);
            }
          } catch (emailError) {
            authLogger.error(`Failed to send password changed email: ${(emailError as Error).message}`);
            // Non-critical, continue
          }
        } catch (redisError) {
          authLogger.error(`Error clearing refresh tokens: ${(redisError as Error).message}`);
          // Non-critical, continue
        }
      }
      
      return success;
    } catch (error) {
      authLogger.error(`Error changing password: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Track authentication performance
   */
  private static async trackAuthPerformance(startTime: number, operation: string): Promise<void> {
    try {
      const executionTimeMs = Date.now() - startTime;
      
      // Dynamic import to avoid circular dependencies
      const PerformanceService = await import("../../analytics/services/performance.service");
      if (PerformanceService.default) {
        await PerformanceService.default.trackQueryPerformance({
          userId: 0, // System
          executionTimeMs,
          queryType: operation,
          success: operation.includes("success"),
          timestamp: new Date()
        });
      }
    } catch (error) {
      authLogger.error(`Failed to track auth performance: ${(error as Error).message}`);
      // Non-critical, just log
    }
  }
}

export default AuthService;