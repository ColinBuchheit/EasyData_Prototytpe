import { Pool as PostgresPool } from "pg";
import mysql from "mysql2/promise";
import sql from "mssql";
import { Database as SQLiteDatabase } from "sqlite";
import logger from "../config/logger";

/**
 * Fetches PostgreSQL schema metadata.
 */
export const getPostgresSchema = async (pool: PostgresPool) => {
  try {
    if (!pool) throw new Error(`❌ No active PostgreSQL connection.`);
    
    const query = `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public';`;
    const { rows } = await pool.query(query);
    
    if (!rows.length) {
      logger.warn("⚠️ PostgreSQL schema is empty.");
      return {};
    }

    const schema = rows.reduce((acc, row) => {
      acc[row.table_name] = acc[row.table_name] || [];
      acc[row.table_name].push({ column: row.column_name, type: row.data_type });
      return acc;
    }, {} as Record<string, { column: string; type: string }[]>);

    logger.info("✅ PostgreSQL schema introspection completed.");
    return schema;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Error retrieving PostgreSQL schema: ${err.message}`);
    throw error;
  }
};

/**
 * Fetches MySQL schema metadata.
 */
export const getMySQLSchema = async (connection: mysql.Connection) => {
  try {
    if (!connection) throw new Error(`❌ No active MySQL connection.`);

    const [rows] = await connection.execute<any[]>(`SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, DATA_TYPE AS data_type FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE();`);

    if (!rows.length) {
      logger.warn("⚠️ MySQL schema is empty.");
      return {};
    }

    const schema = rows.reduce((acc, row) => {
      acc[row.table_name] = acc[row.table_name] || [];
      acc[row.table_name].push({ column: row.column_name, type: row.data_type });
      return acc;
    }, {} as Record<string, { column: string; type: string }[]>);

    logger.info("✅ MySQL schema introspection completed.");
    return schema;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Error retrieving MySQL schema: ${err.message}`);
    throw error;
  }
};

/**
 * Fetches SQLite schema metadata.
 */
export const getSQLiteSchema = async (db: SQLiteDatabase) => {
  try {
    if (!db) throw new Error(`❌ No active SQLite connection.`);

    const rows = await db.all(`PRAGMA table_info('your_table_name')`);
    
    if (!rows.length) {
      logger.warn("⚠️ SQLite schema is empty.");
      return {};
    }

    const schema = rows.map(row => ({
      column: row.name,
      type: row.type,
    }));

    logger.info("✅ SQLite schema introspection completed.");
    return schema;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Error retrieving SQLite schema: ${err.message}`);
    throw error;
  }
};
