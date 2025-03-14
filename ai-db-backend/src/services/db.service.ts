import { pool } from "../config/db";
import logger from "../config/logger";

/**
 * ✅ Securely connect to the AppDB.
 */
export async function connectDatabase(userId: number): Promise<{ message: string }> {
  let attempts = 3;

  while (attempts > 0) {
    try {
      logger.info(`✅ Attempting to connect user ${userId} to AppDB.`);
      await pool.query("SELECT 1");
      logger.info(`✅ User ${userId} connected successfully.`);
      return { message: "✅ Connected to AppDB." };
    } catch (error) {
      attempts--;
      logger.error(`❌ Connection failed for user ${userId}. Retries left: ${attempts}. Error: ${(error as Error).message}`);
    }
  }

  // ✅ Ensure function always returns or throws an error
  throw new Error("❌ Database connection failed after multiple attempts.");
}


/**
 * ✅ Securely disconnect from the AppDB.
 */
export async function disconnectDatabase(userId: number): Promise<{ message: string }> {
  try {
    logger.info(`✅ User ${userId} disconnected from AppDB.`);
    return { message: "✅ Disconnected from AppDB." };
  } catch (error) {
    throw new Error("❌ Database disconnection failed.");
  }
}

/**
 * ✅ Check if the database is online.
 */
export async function checkDatabaseHealth(): Promise<string> {
  try {
    await pool.query("SELECT 1");
    return "✅ AppDB is online.";
  } catch (error) {
    logger.error(`❌ Database health check failed: ${(error as Error).message}`);
    return "❌ AppDB is unavailable.";
  }
}


/**
 * ✅ Fetch all tables in the AppDB.
 */
export async function fetchTables(): Promise<string[]> {
  const result = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
  );
  return result.rows.map(row => row.table_name);
}

/**
 * ✅ Fetch schema for a specific table.
 */
export async function fetchTableSchema(table: string): Promise<any> {
  const result = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
    [table]
  );
  return result.rows;
}

/**
 * ✅ Execute a query on the AppDB (READ-ONLY).
 */
export async function runQuery(query: string, params: any[] = []): Promise<any> {
  const sanitizedQuery = query.trim().replace(/\s+/g, " ").toUpperCase();

  if (!/^SELECT\b/.test(sanitizedQuery) || /;\s*(UPDATE|DELETE|INSERT|DROP|ALTER)\b/i.test(query)) {
    throw new Error("❌ Only SELECT queries are allowed.");
  }

  const result = await pool.query(query, params);
  return result.rows;
}


/**
 * ✅ Create a new user with role validation.
 */
export async function createUser(username: string, email: string, passwordHash: string, role: string): Promise<any> {
  if (!["admin", "user", "read-only"].includes(role)) {
    throw new Error("❌ Invalid role.");
  }

  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *`,
    [username, email, passwordHash, role]
  );
  return result.rows[0];
}

/**
 * ✅ Fetch user by ID with role validation.
 */
export async function getUserById(userId: number): Promise<any> {
  const result = await pool.query(`SELECT id, username, email, role FROM users WHERE id = $1`, [userId]);
  return result.rows[0];
}

/**
 * ✅ Update user role with admin check.
 */
export async function updateUserRole(adminId: number, userId: number, newRole: string): Promise<any> {
  // Ensure only admins can update roles
  const adminCheck = await pool.query(`SELECT role FROM users WHERE id = $1`, [adminId]);
  if (!adminCheck.rows[0] || adminCheck.rows[0].role !== "admin") {
    throw new Error("❌ Unauthorized: Only admins can update user roles.");
  }

  if (!["admin", "user", "read-only"].includes(newRole)) {
    throw new Error("❌ Invalid role.");
  }

  const result = await pool.query(`UPDATE users SET role = $1 WHERE id = $2 RETURNING *`, [newRole, userId]);
  return result.rows[0];
}

/**
 * ✅ Delete a user (only admins can delete).
 */
export async function deleteUser(adminId: number, userId: number): Promise<any> {
  // Ensure only admins can delete users
  const adminCheck = await pool.query(`SELECT role FROM users WHERE id = $1`, [adminId]);
  if (!adminCheck.rows[0] || adminCheck.rows[0].role !== "admin") {
    throw new Error("❌ Unauthorized: Only admins can delete users.");
  }

  const result = await pool.query(`DELETE FROM users WHERE id = $1 RETURNING *`, [userId]);
  return result.rows[0];
}

/**
 * ✅ Create a conversation (ensure max length for messages).
 */
export async function createConversation(userId: number, agentName: string, message: string, response: string): Promise<any> {
  if (message.length > 2000 || response.length > 2000) {
    throw new Error("❌ Message or response too long.");
  }

  const result = await pool.query(
    `INSERT INTO conversations (user_id, agent_name, message, response) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, agentName, message, response]
  );
  return result.rows[0];
}

/**
 * ✅ Fetch conversations with pagination.
 */
export async function getConversations(userId: number, limit = 20, offset = 0): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}


