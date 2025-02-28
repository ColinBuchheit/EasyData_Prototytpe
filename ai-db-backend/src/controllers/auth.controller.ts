// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ENV } from "../config/env";
import { registerUser, findUserByUsername } from "../services/user.service";

/**
 * Register a new user.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, role } = req.body;

    // ✅ Validate input
    if (!username || typeof username !== "string" || username.length < 3) {
      res.status(400).json({ message: "❌ Invalid username format." });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ message: "❌ Password must be at least 6 characters long." });
      return;
    }

    console.log("🔍 Registering user:", username);

    // Check if user already exists
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      console.log("❌ User already exists:", username);
      res.status(400).json({ message: "❌ User already exists" });
      return;
    }

    // ✅ Pass raw password to `registerUser()` (NO HASHING HERE)
    const newUser = await registerUser({ username, password, role });

    console.log("✅ User registered successfully:", newUser);
    res.status(201).json({ message: "✅ User registered successfully", user: newUser });
  } catch (error) {
    console.error("❌ Error registering user:", error);
    res.status(500).json({ message: "Error registering user" });
  }
};

/**
 * Authenticate a user and return a JWT token.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // ✅ Validate input
    if (!username || typeof username !== "string") {
      res.status(400).json({ message: "❌ Invalid username format." });
      return;
    }
    if (!password || typeof password !== "string") {
      res.status(400).json({ message: "❌ Invalid password format." });
      return;
    }

    console.log("🔍 Login attempt for user:", username);

    // Find user by username
    const user = await findUserByUsername(username);
    if (!user) {
      console.log("❌ User not found in database:", username);
      res.status(401).json({ message: "❌ Invalid credentials" });
      return;
    }

    console.log("🔍 Retrieved user from DB:", user);
    console.log("🔍 Entered password:", password);
    console.log("🔍 Stored hash from DB:", user.password_hash);

    // Validate password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    console.log("🔍 Password match result:", passwordValid);

    if (!passwordValid) {
      console.log("❌ Password does not match.");
      res.status(401).json({ message: "❌ Invalid credentials" });
      return;
    }

    // ✅ Generate JWT token
    const token = jwt.sign({ id: user.id, role: user.role }, ENV.JWT_SECRET, { expiresIn: "1h" });

    console.log("✅ Login successful, token generated.");
    res.json({ message: "✅ Login successful", token });
  } catch (error) {
    console.error("❌ Error logging in:", error);
    res.status(500).json({ message: "Error logging in" });
  }
};
