// src/services/user.service.ts
import bcrypt from "bcrypt";
import { pool } from "../config/db";
import { User } from "../models/user.model";
import logger from "../config/logger";

const saltRounds = 10;

/**
 * ✅ Registers a new user securely.
 */
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
    // ✅ Enforce strong password policies
    const passwordPolicy = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
    if (!passwordPolicy.test(password)) {
      throw new Error("❌ Password must be at least 8 characters long, include one uppercase, one number, and one special character.");
    }

    logger.info(`🔍 Registering user: ${username}`);

    // ✅ Ensure valid role assignment (Prevent unauthorized admin creation)
    if (!["user", "admin"].includes(role)) {
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

/**
 * ✅ Finds a user by their username.
 */
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

/**
 * ✅ Stores the database type for a user securely.
 */
export const storeUserDatabaseType = async (userId: number, dbType: string): Promise<void> => {
  try {
    logger.info(`🔍 Storing database type for user ${userId}: ${dbType}`);

    // ✅ Validate database type before storing
    const validDbTypes = ["postgres", "mysql", "mssql", "sqlite", "mongo", "firebase", "couchdb", "dynamodb"];
    if (!validDbTypes.includes(dbType)) {
      throw new Error(`❌ Invalid database type: ${dbType}`);
    }

    await pool.query(
      "INSERT INTO user_database_types (user_id, db_type) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET db_type = $2",
      [userId, dbType]
    );

    logger.info(`✅ Database type stored for user ${userId}: ${dbType}`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Error storing database type: ${err.message}`);
    throw err;
  }
};

/**
 * ✅ Retrieves all users with pagination.
 */
export async function getUsers(limit: number = 20, offset: number = 0) {
  try {
    const query = "SELECT id, username, role FROM users LIMIT $1 OFFSET $2";
    const values = [limit, offset];

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    const err = error as Error;
    logger.error(`❌ Error fetching users: ${err.message}`);
    throw new Error("Failed to fetch users.");
  }
}

/**
 * ✅ Retrieves a user by their ID.
 */
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

/**
 * ✅ Updates a user's profile (Only Admins can modify roles).
 */
export const updateUserById = async (id: string, data: Partial<User>, requesterRole: string): Promise<User> => {
  try {
    const { username, role } = data;

    logger.info(`🔍 Updating user ${id} with new data:`, data);

    // ✅ Ensure only admins can modify roles
    if (role && requesterRole !== "admin") {
      throw new Error("❌ Only admins can change user roles.");
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

/**
 * ✅ Deletes a user from the database.
 */
export const deleteUserById = async (id: string): Promise<boolean> => {
  try {
    logger.info(`🔍 Deleting user ID: ${id}`);

    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING *", [id]);

    if (result.rowCount === 0) {
      throw new Error(`❌ No user found with ID: ${id}`);
    }

    logger.info(`✅ User ${id} deleted.`);
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Error deleting user: ${err.message}`);
    throw err;
  }
};
