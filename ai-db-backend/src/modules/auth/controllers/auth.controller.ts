// src/modules/auth/controllers/auth.controller.ts
import { Request, Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { UserService } from "../../user/services/user.service";
import { AuthRequest } from "../middleware/verification.middleware";
import { AuthService } from "../services/auth.service";
import { blacklistToken, refreshToken, generateResetToken, validateResetToken } from "../services/token.service";
import { hashPassword, validatePasswordStrength } from "../services/password.service";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { getRedisClient } from "../../../config/redis";
import { AuthEmailService } from "../services/email.service";

const authLogger = createContextLogger("AuthController");

/**
 * Register a new user
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  let { username, email, password, role } = req.body;
  role = role || "user"; 

  // Enforce strong password policy
  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.valid) {
    return res.status(400).json({ success: false, message: passwordCheck.message });
  }

  // Check if user exists
  if (await UserService.getUserByUsername(username) || await UserService.getUserByEmail(email)) {
    return res.status(400).json({ success: false, message: "User already exists." });
  }

  // Hash password before saving
  const hashedPassword = await hashPassword(password);
  console.log(`[AUTH DEBUG] Registration - Original password length: ${password.length}, Hash length: ${hashedPassword.length}`);
  
  const newUser = await UserService.createUser({
    username,
    email,
    password: hashedPassword,
    role
  });

  // Track successful registration for security analytics
  try {
    const UsageService = await import("../../analytics/services/usage.service");
    if (UsageService.default) {
      await UsageService.default.trackUserAction(newUser.id, "register");
    }
  } catch (error) {
    // Non-critical operation, just log the error
    authLogger.error(`Failed to track user registration: ${(error as Error).message}`);
  }
  
  // Send welcome email
  try {
    await AuthEmailService.sendWelcomeEmail(email, username);
  } catch (error) {
    // Non-critical operation, just log the error
    authLogger.error(`Failed to send welcome email: ${(error as Error).message}`);
  }

  res.status(201).json({ 
    success: true, 
    message: "User registered successfully", 
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    }
  });
});

// This should be in your auth controller on the backend
export const verifyToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Get full user data (omitting sensitive information)
  const user = await UserService.getUserById(req.user.id);
  
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  
  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status
    }
  });
});

/**
 * Authenticate user & generate JWT token
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Invalid username or password format." });
  }

  const authResult = await AuthService.login(username, password);
  if (!authResult.success) {
    // Track failed login attempt for security analytics
    try {
      const user = await UserService.getUserByUsername(username);
      if (user) {
        const SecurityService = await import("../../analytics/services/security.service");
        if (SecurityService.default) {
          await SecurityService.default.trackSecurityEvent(
            'failed_login',
            'medium',
            `Failed login attempt for username: ${username}`,
            { 
              userId: user.id,
              sourceIp: req.ip
            }
          );
        }
      }
    } catch (error) {
      // Non-critical, just log
      authLogger.error(`Failed to track security event: ${(error as Error).message}`);
    }
    
    return res.status(401).json({ success: false, message: authResult.message });
  }

  // Track successful login for analytics
  try {
    if (authResult.user?.id) {
      const UsageService = await import("../../analytics/services/usage.service");
      if (UsageService.default) {
        await UsageService.default.trackUserAction(authResult.user.id, "login");
      }
    }
  } catch (error) {
    // Non-critical, just log
    authLogger.error(`Failed to track user login: ${(error as Error).message}`);
  }

  res.json(authResult);
});

/**
 * Refresh JWT Token
 */
export const refreshTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  const oldToken = req.body.token;
  if (!oldToken) {
    return res.status(400).json({ success: false, message: "Missing refresh token." });
  }

  const newToken = await refreshToken(oldToken);
  if (!newToken) {
    return res.status(403).json({ 
      success: false, 
      message: "Invalid or expired refresh token. Please log in again." 
    });
  }

  res.json({ success: true, message: "Token refreshed", token: newToken });
});

/**
 * Logout User (JWT-based logout using Redis blacklist)
 */
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  
  if (token) {
    await blacklistToken(token);
    
    // Track logout for analytics
    try {
      const UsageService = await import("../../analytics/services/usage.service");
      if (UsageService.default) {
        await UsageService.default.trackUserAction(req.user.id, "logout");
      }
    } catch (error) {
      // Non-critical, just log
      authLogger.error(`Failed to track user logout: ${(error as Error).message}`);
    }
  }

  res.json({ success: true, message: "Logout successful" });
});

/**
 * Request password reset (step 1 of reset flow)
 */
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  const user = await UserService.getUserByEmail(email);
  
  // Always return success even if user not found (security best practice)
  if (!user) {
    authLogger.info(`Password reset requested for non-existent email: ${email}`);
    return res.json({ 
      success: true, 
      message: "If your email is registered, you will receive reset instructions." 
    });
  }

  // Generate a reset token
  const resetToken = generateResetToken(user.id);
  
  // Store token in Redis with expiration (15 minutes)
  const redisClient = await getRedisClient();
  await redisClient.set(`reset_token:${user.id}`, resetToken, "EX", 15 * 60);
  
  // Generate reset URL
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  // Send email with reset link
  try {
    await AuthEmailService.sendPasswordResetEmail(email, resetUrl);
    authLogger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    authLogger.error(`Failed to send password reset email: ${(error as Error).message}`);
    // We still return success to user for security reasons
  }
  
  res.json({ 
    success: true, 
    message: "If your email is registered, you will receive reset instructions." 
  });
});

/**
 * Validate reset token (step 2 of reset flow)
 */
export const validateResetTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: "Reset token is required." });
  }

  const result = validateResetToken(token);
  
  if ('error' in result) {
    return res.status(400).json({ success: false, message: result.error });
  }
  
  // Verify token exists in Redis
  const redisClient = await getRedisClient();
  const storedToken = await redisClient.get(`reset_token:${result.userId}`);
  
  if (!storedToken || storedToken !== token) {
    return res.status(400).json({ success: false, message: "Invalid or expired reset token." });
  }
  
  res.json({ success: true, message: "Token is valid" });
});

/**
 * Reset Password (step 3 of reset flow)
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: "Token and new password are required." });
  }

  // Validate password strength
  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.valid) {
    return res.status(400).json({ success: false, message: passwordCheck.message });
  }

  // Validate token
  const result = validateResetToken(token);
  if ('error' in result) {
    return res.status(400).json({ success: false, message: result.error });
  }
  
  // Verify token exists in Redis
  const redisClient = await getRedisClient();
  const storedToken = await redisClient.get(`reset_token:${result.userId}`);
  
  if (!storedToken || storedToken !== token) {
    return res.status(400).json({ success: false, message: "Invalid or expired reset token." });
  }

  // Get user email from userId
  const user = await UserService.getUserById(result.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  // Reset the password
  const success = await AuthService.resetPassword(result.userId, user.email, newPassword);
  
  if (!success) {
    return res.status(400).json({ success: false, message: "Password reset failed." });
  }
  
  // Delete the reset token from Redis
  await redisClient.del(`reset_token:${result.userId}`);
  
  // Track password reset for security analytics
  try {
    const UsageService = await import("../../analytics/services/usage.service");
    if (UsageService.default) {
      await UsageService.default.trackUserAction(result.userId, "password_change");
    }
  } catch (error) {
    // Non-critical, just log
    authLogger.error(`Failed to track password reset: ${(error as Error).message}`);
  }

  res.json({ success: true, message: "Password successfully reset." });
});

/**
 * Change Password when user is logged in
 */
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Current password and new password are required." });
  }

  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.valid) {
    return res.status(400).json({ success: false, message: passwordCheck.message });
  }

  // Need to get the user to get their email
  const user = await UserService.getUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const success = await AuthService.changePassword(userId, user.email, currentPassword, newPassword);
  
  if (!success) {
    // Track failed password change for security analytics
    try {
      const SecurityService = await import("../../analytics/services/security.service");
      if (SecurityService.default) {
        await SecurityService.default.trackSecurityEvent(
          'unauthorized_access',
          'medium',
          `Failed password change attempt for user ${userId}`,
          { 
            userId: userId,
            sourceIp: req.ip
          }
        );
      }
    } catch (error) {
      // Non-critical, just log
      authLogger.error(`Failed to track security event: ${(error as Error).message}`);
    }
    
    return res.status(400).json({ success: false, message: "Password change failed. Incorrect current password." });
  }
  
  // Track successful password change
  try {
    const UsageService = await import("../../analytics/services/usage.service");
    if (UsageService.default) {
      await UsageService.default.trackUserAction(userId, "password_change");
    }
  } catch (error) {
    // Non-critical, just log
    authLogger.error(`Failed to track password change: ${(error as Error).message}`);
  }

  res.json({ success: true, message: "Password successfully changed." });
});
