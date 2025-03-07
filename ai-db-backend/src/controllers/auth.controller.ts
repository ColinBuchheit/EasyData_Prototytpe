// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env";
import { registerUser, findUserByUsername, storeUserDatabaseType } from "../services/user.service";
import logger from "../config/logger";
import bcrypt from "bcrypt";
import crypto from "crypto";

/**
 * Safely compares two values to prevent timing attacks.
 */
const safeCompare = (a: string, b: string) => {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/**
 * Register a new user.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, role, dbType } = req.body;

    // ✅ Validate input
    if (!username || typeof username !== "string" || username.length < 3) {
      res.status(400).json({ message: "❌ Invalid username format." });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ message: "❌ Password must be at least 6 characters long." });
      return;
    }
    if (!["admin", "user"].includes(role)) {
      res.status(400).json({ message: "❌ Invalid role. Allowed: 'admin', 'user'." });
      return;
    }

    logger.info(`🔍 Registering user: ${username}`);

    // Check if user exists in SQL or NoSQL
    const existingUser = await findUserByUsername(username); // ✅ Ensure function is called correctly
    if (existingUser) {
      res.status(400).json({ message: `❌ User already exists in ${dbType || "SQL"} database.` });
      return;
    }

    // ✅ Create the user (Hashing occurs inside `registerUser`)
    const newUser = await registerUser({ username, password, role });

    // ✅ Store dbType separately (if applicable)
    if (dbType) {
      await storeUserDatabaseType(newUser.id, dbType);
    }

    logger.info(`✅ User registered successfully: ${newUser.username}`);
    res.status(201).json({ message: "✅ User registered successfully", user: newUser });
  } catch (error) {
    logger.error(`❌ Error registering user: ${(error as Error).message}`);
    res.status(500).json({ message: "Error registering user" });
  }
};

/**
 * Authenticate a user and return a JWT token.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, dbType } = req.body;

    // ✅ Validate input
    if (!username || typeof username !== "string") {
      res.status(400).json({ message: "❌ Invalid username format." });
      return;
    }
    if (!password || typeof password !== "string") {
      res.status(400).json({ message: "❌ Invalid password format." });
      return;
    }

    // ✅ Find user in SQL or NoSQL database
    const user = await findUserByUsername(username);
    if (!user) {
      res.status(401).json({ message: "❌ Invalid credentials" });
      return;
    }

    // ✅ Validate password securely (handle missing salt case)
    const passwordValid = await bcrypt.compare(password, user.password_hash);


    if (!passwordValid) {
      logger.warn(`❌ Failed login attempt for user: ${username}`);
      res.status(401).json({ message: "❌ Invalid credentials" });
      return;
    }
    

    // ✅ Generate JWT token securely
    const token = jwt.sign(
      { id: user.id, role: user.role, dbType },
      ENV.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "✅ Login successful", token });
  } catch (error) {
    logger.error(`❌ Error logging in: ${(error as Error).message}`);
    res.status(500).json({ message: "Error logging in" });
  }
};
