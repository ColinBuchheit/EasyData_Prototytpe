// src/services/schemaIntrospection.ts

import { Pool as PostgresPool } from "pg";
import mysql from "mysql2/promise";
import sql from "mssql";
import { Database as SQLiteDatabase } from "sqlite";
import logger from "../config/logger";

// PostgreSQL Schema Introspection
export const getPostgresSchema = async (pool: PostgresPool) => {
  try {
    const query = `
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;

    const { rows } = await pool.query(query);
    if (!rows.length) {
      logger.warn("⚠️ PostgreSQL schema is empty.");
      return {};
    }

    const schema: Record<string, { column: string; type: string }[]> = {};
    rows.forEach((row) => {
      schema[row.table_name] = schema[row.table_name] || [];
      schema[row.table_name].push({ column: row.column_name, type: row.data_type });
    });

    logger.info("✅ PostgreSQL schema introspection completed.");
    return schema;
  } catch (error) {
    logger.error("❌ Error retrieving PostgreSQL schema:", error);
    throw error;
  }
};

// MySQL Schema Introspection
export const getMySQLSchema = async (pool: mysql.Pool) => {
  try {
    const query = `
      SELECT TABLE_NAME as table_name, COLUMN_NAME as column_name, DATA_TYPE as data_type
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE();
    `;

    const [rows] = await pool.execute(query);
    if (!(rows as any[]).length) {
      logger.warn("⚠️ MySQL schema is empty.");
      return {};
    }

    const schema: Record<string, { column: string; type: string }[]> = {};
    (rows as any[]).forEach((row) => {
      schema[row.table_name] = schema[row.table_name] || [];
      schema[row.table_name].push({ column: row.column_name, type: row.data_type });
    });

    logger.info("✅ MySQL schema introspection completed.");
    return schema;
  } catch (error) {
    logger.error("❌ Error retrieving MySQL schema:", error);
    throw error;
  }
};

// MSSQL Schema Introspection
export const getMSSQLSchema = async (pool: sql.ConnectionPool) => {
  try {
    const query = `
      SELECT TABLE_NAME as table_name, COLUMN_NAME as column_name, DATA_TYPE as data_type
      FROM INFORMATION_SCHEMA.COLUMNS;
    `;

    const result = await pool.request().query(query);
    if (!result.recordset.length) {
      logger.warn("⚠️ MSSQL schema is empty.");
      return {};
    }

    const schema: Record<string, { column: string; type: string }[]> = {};
    result.recordset.forEach((row) => {
      schema[row.table_name] = schema[row.table_name] || [];
      schema[row.table_name].push({ column: row.column_name, type: row.data_type });
    });

    logger.info("✅ MSSQL schema introspection completed.");
    return schema;
  } catch (error) {
    logger.error("❌ Error retrieving MSSQL schema:", error);
    throw error;
  }
};

// SQLite Schema Introspection
export const getSQLiteSchema = async (db: SQLiteDatabase) => {
  try {
    const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table';`);
    if (!tables.length) {
      logger.warn("⚠️ SQLite schema is empty.");
      return {};
    }

    const schema: Record<string, { column: string; type: string }[]> = {};
    for (const table of tables) {
      const columns = await db.all(`PRAGMA table_info(${table.name});`);
      schema[table.name] = columns.map((col: any) => ({
        column: col.name,
        type: col.type,
      }));
    }

    logger.info("✅ SQLite schema introspection completed.");
    return schema;
  } catch (error) {
    logger.error("❌ Error retrieving SQLite schema:", error);
    throw error;
  }
};
