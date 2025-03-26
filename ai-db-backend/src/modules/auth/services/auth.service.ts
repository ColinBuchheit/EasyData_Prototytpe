// src/modules/auth/services/auth.service.ts
import { createContextLogger } from "../../../config/logger";
import { findUserByEmail, findUserByUsername, updateUserPasswordById } from "../../user/services/user.service";
import { AuthResponse } from "../models/auth.model";
import { comparePassword, hashPassword, validatePasswordStrength } from "./password.service";
import { generateToken } from "./token.service";

const authLogger = createContextLogger("AuthService");

export class AuthService {
  /**
   * Authenticate a user
   */
  public static async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const user = await findUserByUsername(username);
      if (!user) {
        return { success: false, message: "Invalid credentials" };
      }

      const passwordValid = await comparePassword(password, user.password_hash);
      if (!passwordValid) {
        authLogger.warn(`Failed login attempt for user: ${username}`);
        return { success: false, message: "Invalid credentials" };
      }

      const token = generateToken(user.id, user.role);
      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      };
    } catch (error) {
      authLogger.error(`Error logging in: ${(error as Error).message}`);
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
        authLogger.warn(`Password reset failed: ${passwordCheck.message}`);
        return false;
      }

      const hashedPassword = await hashPassword(newPassword);
      return await updateUserPasswordById(userId, email, "", hashedPassword);
    } catch (error) {
      authLogger.error(`Error resetting password: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Change a user's password
   */
  public static async changePassword(userId: number, email: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const passwordCheck = validatePasswordStrength(newPassword);
      if (!passwordCheck.valid) {
        return false;
      }

      const hashedPassword = await hashPassword(newPassword);
      return await updateUserPasswordById(userId, email, currentPassword, hashedPassword);
    } catch (error) {
      authLogger.error(`Error changing password: ${(error as Error).message}`);
      return false;
    }
  }
}

export default AuthService;