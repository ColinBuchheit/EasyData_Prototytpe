import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ENV } from "../config/env";
import { registerUser, findUserByUsername, findUserByEmail, updateUserPasswordById } from "../services/user.service";
import { AuthService } from "../services/auth.service";
import logger from "../config/logger";
import { AuthRequest } from "../middleware/auth";
import { getRedisClient } from "../config/redis";
import { pool } from "mssql";

/**
 * ✅ Register a new user
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    let { username, email, password, role } = req.body;
    role = role || "user"; 

    // ✅ Enforce strong password policy
    const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      res.status(400).json({ message: "❌ Password must be at least 8 characters, include one uppercase letter, and one number." });
      return;
    }

    // ✅ Check if user exists
    if (await findUserByUsername(username) || await findUserByEmail(email)) {
      res.status(400).json({ message: `❌ User already exists.` });
      return;
    }

    // ✅ Hash password before saving
    const hashedPassword = await AuthService.hashPassword(password);
    const newUser = await registerUser(username, email, hashedPassword, role);

    res.status(201).json({ message: "✅ User registered successfully", user: newUser });
  } catch (error) {
    logger.error(`❌ Error registering user: ${(error as Error).message}`);
    res.status(500).json({ message: "Error registering user" });
  }
};

/**
 * ✅ Authenticate user & generate JWT token
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: "❌ Invalid username or password format." });
      return;
    }

    const user = await findUserByUsername(username);
    if (!user) {
      res.status(401).json({ message: "❌ Invalid credentials" });
      return;
    }

    // ✅ Validate password securely
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      logger.warn(`❌ Failed login attempt for user: ${username}`);
      res.status(401).json({ message: "❌ Invalid credentials" });
      return;
    }

    // ✅ Generate JWT token securely
    const token = AuthService.generateToken(user.id, user.role);
    res.json({ message: "✅ Login successful", token });
  } catch (error) {
    logger.error(`❌ Error logging in: ${(error as Error).message}`);
    res.status(500).json({ message: "Error logging in" });
  }
};

/**
 * ✅ Refresh JWT Token (if valid)
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const oldToken = req.body.token;
    if (!oldToken) {
      res.status(400).json({ message: "❌ Missing refresh token." });
      return;
    }

    const redisClient = await getRedisClient();
    
    // ❌ Prevent reuse of blacklisted tokens
    if (await redisClient.get(`blacklist:${oldToken}`)) {
      logger.warn("❌ Attempted to reuse a revoked token.");
      res.status(403).json({ message: "❌ Token has been revoked. Please log in again." });
      return;
    }

    const newToken = AuthService.refreshToken(oldToken);
    if (!newToken) {
      res.status(403).json({ message: "❌ Invalid or expired refresh token. Please log in again." });
      return;
    }

    res.json({ message: "✅ Token refreshed", token: newToken });
  } catch (error) {
    logger.error(`❌ Error refreshing token: ${(error as Error).message}`);
    res.status(500).json({ message: "Error refreshing token" });
  }
};

/**
 * ✅ Logout User (JWT-based logout using Redis blacklist)
 */
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const redisClient = await getRedisClient();
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      const decoded = AuthService.verifyToken(token);
      if ("error" in decoded) {
        res.status(400).json({ message: "Invalid or expired token." });
        return;
      }

      // ✅ Set blacklist expiration based on token expiration
      const tokenExpiry = (jwt.decode(token) as any)?.exp || Math.floor(Date.now() / 1000) + 3600;
      const ttl = tokenExpiry - Math.floor(Date.now() / 1000);

      await redisClient.set(`blacklist:${token}`, "true", "EX", ttl);
    }

    res.json({ message: "✅ Logout successful" });
  } catch (error) {
    res.status(500).json({ message: "Error logging out" });
  }
};

/**
 * ✅ Reset Password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      res.status(400).json({ message: "❌ Email and new password are required." });
      return;
    }

    // ✅ Ensure strong new password
    const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      res.status(400).json({ message: "❌ Password must be at least 8 characters, include one uppercase letter, and one number." });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(404).json({ message: "❌ User not found." });
      return;
    }

    const hashedPassword = await AuthService.hashPassword(newPassword);
    
    // ✅ Corrected function call
    await updateUserPasswordById(user, email, "", hashedPassword);

    res.json({ message: "✅ Password successfully reset." });
  } catch (error) {
    logger.error(`❌ Error resetting password: ${(error as Error).message}`);
    res.status(500).json({ message: "Error resetting password" });
  }
};

