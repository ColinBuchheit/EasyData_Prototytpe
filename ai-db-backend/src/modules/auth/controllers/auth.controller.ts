// src/modules/auth/controllers/auth.controller.ts
import { Request, Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { registerUser, findUserByUsername, findUserByEmail } from "../../user/services/user.service";
import { AuthRequest } from "../middleware/verification.middleware";
import { AuthService } from "../services/auth.service";
import { blacklistToken, refreshToken } from "../services/token.service";
import { hashPassword, validatePasswordStrength } from "../services/password.service";
import { asyncHandler } from "../../../shared/utils/errorHandler";

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
  if (await findUserByUsername(username) || await findUserByEmail(email)) {
    return res.status(400).json({ success: false, message: "User already exists." });
  }

  // Hash password before saving
  const hashedPassword = await hashPassword(password);
  const newUser = await registerUser(username, email, hashedPassword, role);

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
    return res.status(401).json({ success: false, message: authResult.message });
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
  }

  res.json({ success: true, message: "Logout successful" });
});

/**
 * Reset Password
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ success: false, message: "Email and new password are required." });
  }

  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.valid) {
    return res.status(400).json({ success: false, message: passwordCheck.message });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const success = await AuthService.resetPassword(user.id, email, newPassword);
  
  if (!success) {
    return res.status(400).json({ success: false, message: "Password reset failed." });
  }

  res.json({ success: true, message: "Password successfully reset." });
});

/**
 * Change Password
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

  const user = await findUserByUsername(req.user.username);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const success = await AuthService.changePassword(userId, user.email, currentPassword, newPassword);
  
  if (!success) {
    return res.status(400).json({ success: false, message: "Password change failed. Incorrect current password." });
  }

  res.json({ success: true, message: "Password successfully changed." });
});