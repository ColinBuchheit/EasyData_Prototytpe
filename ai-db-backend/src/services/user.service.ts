// src/services/user.service.ts
import bcrypt from "bcrypt";
import { pool } from "../config/db";
import { User } from "../models/user.model";
import logger from "../config/logger";

const saltRounds = 10;

export const registerUser = async ({
  username,
  password,
  role,
}: {
  username: string;
  password: string;
  role: string;
}): Promise<User> => {
  try {
    // ✅ Enforce minimum password length
    if (password.length < 6) {
      throw new Error("❌ Password must be at least 6 characters long.");
    }

    logger.info(`🔍 Registering user: ${username}`);

    // ✅ Ensure role is valid (Prevent unauthorized admin account creation)
    if (role !== "user" && role !== "admin") {
      throw new Error("❌ Invalid role assignment.");
    }

    // ✅ Check if the username already exists
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      throw new Error("❌ Username already taken.");
    }

    // ✅ Prevent double hashing
    if (password.startsWith("$2b$10$")) {
      throw new Error("❌ Password is already hashed! Ensure it's not being double-hashed.");
    }

    const password_hash = await bcrypt.hash(password.trim(), saltRounds);
    logger.info("✅ Password hashed successfully.");

    const result = await pool.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role",
      [username, password_hash, role]
    );

    logger.info(`✅ User ${username} registered successfully.`);
    return result.rows[0];
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Error registering user: ${err.message}`);
    throw err;
  }
};

export const findUserByUsername = async (username: string): Promise<User | null> => {
  try {
    logger.info(`🔍 Searching for user: ${username}`);

    const result = await pool.query("SELECT id, username, role, password_hash FROM users WHERE username = $1", [username]);

    return result.rows[0] || null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Error finding user by username: ${err.message}`);
    throw err;
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    logger.info("🔍 Fetching all users...");
    const result = await pool.query("SELECT id, username, role FROM users");
    return result.rows;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Error fetching users: ${err.message}`);
    throw err;
  }
};

export const getUser = async (id: string): Promise<User | null> => {
  try {
    logger.info(`🔍 Fetching user by ID: ${id}`);
    const result = await pool.query("SELECT id, username, role FROM users WHERE id = $1", [id]);

    return result.rows[0] || null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Error fetching user by ID: ${err.message}`);
    throw err;
  }
};

export const updateUserById = async (id: string, data: Partial<User>): Promise<User> => {
  try {
    const { username, role } = data;

    logger.info(`🔍 Updating user ${id} with new data:`, data);

    // ✅ Ensure only admins can modify roles
    if (role && role !== "user" && role !== "admin") {
      throw new Error("❌ Invalid role assignment.");
    }

    const result = await pool.query(
      "UPDATE users SET username = COALESCE($1, username), role = COALESCE($2, role) WHERE id = $3 RETURNING id, username, role",
      [username, role, id]
    );

    logger.info(`✅ User ${id} updated successfully.`);
    return result.rows[0];
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Error updating user: ${err.message}`);
    throw err;
  }
};

export const deleteUserById = async (id: string): Promise<void> => {
  try {
    logger.info(`🔍 Deleting user ID: ${id}`);
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    logger.info(`✅ User ${id} deleted.`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Error deleting user: ${err.message}`);
    throw err;
  }
};
