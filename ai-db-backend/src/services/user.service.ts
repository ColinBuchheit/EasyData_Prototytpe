import { pool } from "../config/db";
import bcrypt from "bcrypt";
import logger from "../config/logger";

/**
 * ✅ Fetch all users (Admin-only) with pagination.
 */
export const getUsers = async (limit: number, offset: number) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    return result.rows;
  } catch (error) {
    logger.error(`❌ Error fetching users: ${(error as Error).message}`);
    throw new Error("Failed to fetch users.");
  }
};

/**
 * ✅ Fetch a user by ID.
 */
export const getUserById = async (userId: number) => {
  try {
    const result = await pool.query("SELECT id, username, email, role, created_at FROM users WHERE id = $1", [userId]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error(`❌ Error fetching user ${userId}: ${(error as Error).message}`);
    throw new Error("Failed to fetch user.");
  }
};

/**
 * ✅ Update user details (self or admin modifying another user).
 */
export const updateUserById = async (userId: number, data: Partial<{ username: string; email: string; role?: string }>, requesterRole: string) => {
  try {
    const fields = [];
    const values: any[] = [];

    if (data.username) {
      fields.push("username = $"+(fields.length+1));
      values.push(data.username);
    }

    if (data.email) {
      fields.push("email = $"+(fields.length+1));
      values.push(data.email);
    }

    if (data.role && requesterRole === "admin") {
      fields.push("role = $"+(fields.length+1));
      values.push(data.role);
    }

    if (fields.length === 0) {
      throw new Error("❌ No valid fields to update.");
    }

    values.push(userId);
    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING id, username, email, role, created_at`;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  } catch (error) {
    logger.error(`❌ Error updating user ${userId}: ${(error as Error).message}`);
    throw new Error("Failed to update user.");
  }
};

export const findUserByUsername = async (username: string) => {
  try {
    const result = await pool.query("SELECT id, username, email, password_hash, role FROM users WHERE username = $1", [username]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    logger.error(`❌ Error finding user by username: ${(error as Error).message}`);
    throw new Error("Failed to find user.");
  }
};

/**
 * ✅ Find a user by email.
 */
export const findUserByEmail = async (email: string) => {
  try {
    const result = await pool.query("SELECT id, username, email, password_hash, role FROM users WHERE email = $1", [email]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    logger.error(`❌ Error finding user by email: ${(error as Error).message}`);
    throw new Error("Failed to find user.");
  }
};


export const registerUser = async (username: string, email: string, password: string, role = "user") => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at",
      [username, email, hashedPassword, role]
    );

    logger.info(`✅ New user registered: ${username} (${email})`);
    return result.rows[0];
  } catch (error) {
    logger.error(`❌ Error registering user: ${(error as Error).message}`);
    throw new Error("Failed to register user.");
  }
};


/**
 * ✅ Securely update a user's password.
 */
export const updateUserPasswordById = async (userId: number, email: string, currentPassword: string, newPassword: string) => {
  try {
    // ✅ Fetch current password hash
    const result = await pool.query("SELECT password_hash FROM users WHERE id = $1 AND email = $2", [userId, email]);

    if (!result.rows.length) {
      logger.warn(`❌ No matching user found for ID: ${userId}, Email: ${email}`);
      return false;
    }

    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!validPassword) {
      logger.warn(`❌ Incorrect current password for user ${userId}`);
      return false;
    }

    // ✅ Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newPasswordHash, userId]);

    logger.info(`✅ Password updated successfully for User ${userId}`);
    return true;
  } catch (error) {
    logger.error(`❌ Error updating password: ${(error as Error).message}`);
    throw new Error("Failed to update password.");
  }
};

/**
 * ✅ Delete a user (Admin-only).
 */
export const deleteUserById = async (userId: number) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    logger.info(`✅ User ${userId} deleted successfully.`);
    return true;
  } catch (error) {
    logger.error(`❌ Error deleting user ${userId}: ${(error as Error).message}`);
    throw new Error("Failed to delete user.");
  }
};
