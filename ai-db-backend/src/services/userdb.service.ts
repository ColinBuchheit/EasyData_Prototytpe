import { pool } from "../config/db";
import logger from "../config/logger";

/**
 * ✅ Create a new database connection.
 */
export const createDatabaseConnection = async (
  userId: number,
  data: { dbType: string; host: string; port: number; username: string; password: string; dbName: string }
) => {
  try {
    const result = await pool.query(
      `INSERT INTO user_databases (user_id, db_type, host, port, username, password, db_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, db_type, host, port, username, db_name, created_at`,
      [userId, data.dbType, data.host, data.port, data.username, data.password, data.dbName]
    );

    logger.info(`✅ New database connection added for User ${userId}`);
    return result.rows[0];
  } catch (error) {
    logger.error(`❌ Error creating database connection: ${(error as Error).message}`);
    throw new Error("Failed to create database connection.");
  }
};

/**
 * ✅ Fetch all databases owned by the user.
 */
export const fetchUserDatabases = async (userId: number) => {
  try {
    const result = await pool.query(
      "SELECT id, db_type, host, port, username, db_name, created_at FROM user_databases WHERE user_id = $1",
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error(`❌ Error fetching user databases: ${(error as Error).message}`);
    throw new Error("Failed to fetch user databases.");
  }
};

/**
 * ✅ Fetch details of a specific database connection.
 */
export const fetchDatabaseById = async (userId: number, dbId: number) => {
  try {
    const result = await pool.query(
      "SELECT id, db_type, host, port, username, db_name, created_at FROM user_databases WHERE id = $1 AND user_id = $2",
      [dbId, userId]
    );

    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    logger.error(`❌ Error fetching database connection ID ${dbId}: ${(error as Error).message}`);
    throw new Error("Failed to fetch database connection.");
  }
};

/**
 * ✅ Update a database connection's details.
 */
export const updateDatabaseConnection = async (
  userId: number,
  dbId: number,
  data: { dbType?: string; host?: string; port?: number; username?: string; password?: string; dbName?: string }
) => {
  try {
    const fields = [];
    const values: any[] = [];

    if (data.dbType) {
      fields.push(`db_type = $${fields.length + 1}`);
      values.push(data.dbType);
    }
    if (data.host) {
      fields.push(`host = $${fields.length + 1}`);
      values.push(data.host);
    }
    if (data.port) {
      fields.push(`port = $${fields.length + 1}`);
      values.push(data.port);
    }
    if (data.username) {
      fields.push(`username = $${fields.length + 1}`);
      values.push(data.username);
    }
    if (data.password) {
      fields.push(`password = $${fields.length + 1}`);
      values.push(data.password);
    }
    if (data.dbName) {
      fields.push(`db_name = $${fields.length + 1}`);
      values.push(data.dbName);
    }

    if (fields.length === 0) {
      throw new Error("❌ No valid fields to update.");
    }

    values.push(dbId);
    values.push(userId);
    const query = `UPDATE user_databases SET ${fields.join(", ")} WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  } catch (error) {
    logger.error(`❌ Error updating database connection ID ${dbId}: ${(error as Error).message}`);
    throw new Error("Failed to update database connection.");
  }
};

/**
 * ✅ Delete a database connection.
 */
export const deleteDatabaseConnection = async (userId: number, dbId: number) => {
  try {
    await pool.query("DELETE FROM user_databases WHERE id = $1 AND user_id = $2", [dbId, userId]);
    logger.info(`✅ Database connection ID ${dbId} deleted for User ${userId}`);
    return true;
  } catch (error) {
    logger.error(`❌ Error deleting database connection ID ${dbId}: ${(error as Error).message}`);
    throw new Error("Failed to delete database connection.");
  }
};
