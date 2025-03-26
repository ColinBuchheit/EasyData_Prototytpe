// src/modules/database/services/core.service.ts

import { pool } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";

const dbLogger = createContextLogger("CoreDBService");

/**
 * Core Database Service for internal application database
 */
export class CoreDatabaseService {
  /**
   * Securely connect to the AppDB
   */
  static async connectDatabase(userId: number): Promise<{ success: boolean; message: string }> {
    let attempts = 3;

    while (attempts > 0) {
      try {
        dbLogger.info(`Attempting to connect user ${userId} to AppDB.`);
        await pool.query("SELECT 1");
        dbLogger.info(`User ${userId} connected successfully.`);
        return { success: true, message: "Connected to AppDB." };
      } catch (error) {
        attempts--;
        dbLogger.error(`Connection failed for user ${userId}. Retries left: ${attempts}. Error: ${(error as Error).message}`);
      }
    }

    return { success: false, message: "Database connection failed after multiple attempts." };
  }

  /**
   * Securely disconnect from the AppDB
   */
  static async disconnectDatabase(userId: number): Promise<{ success: boolean; message: string }> {
    try {
      dbLogger.info(`User ${userId} disconnected from AppDB.`);
      return { success: true, message: "Disconnected from AppDB." };
    } catch (error) {
      return { success: false, message: "Database disconnection failed." };
    }
  }

  /**
   * Check if the database is online
   */
  static async checkDatabaseHealth(): Promise<{ status: string; isHealthy: boolean }> {
    try {
      await pool.query("SELECT 1");
      return { status: "AppDB is online.", isHealthy: true };
    } catch (error) {
      dbLogger.error(`Database health check failed: ${(error as Error).message}`);
      return { status: "AppDB is unavailable.", isHealthy: false };
    }
  }

  /**
   * Fetch all tables in the AppDB
   */
  static async fetchTables(): Promise<string[]> {
    try {
      const result = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
      );
      return result.rows.map(row => row.table_name);
    } catch (error) {
      dbLogger.error(`Error fetching tables: ${(error as Error).message}`);
      throw new Error("Failed to fetch tables.");
    }
  }

  /**
   * Fetch schema for a specific table
   */
  static async fetchTableSchema(table: string): Promise<any> {
    try {
      const result = await pool.query(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1`,
        [table]
      );
      return result.rows;
    } catch (error) {
      dbLogger.error(`Error fetching schema for table ${table}: ${(error as Error).message}`);
      throw new Error(`Failed to fetch schema for table ${table}.`);
    }
  }

  /**
   * Execute a query on the AppDB (READ-ONLY)
   */
  static async runQuery(query: string, params: any[] = []): Promise<any> {
    try {
      const sanitizedQuery = query.trim().replace(/\s+/g, " ").toUpperCase();

      if (!/^SELECT\b/.test(sanitizedQuery) || /;\s*(UPDATE|DELETE|INSERT|DROP|ALTER)\b/i.test(query)) {
        throw new Error("Only SELECT queries are allowed.");
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      dbLogger.error(`Query execution error: ${(error as Error).message}`);
      throw new Error(`Query execution failed: ${(error as Error).message}`);
    }
  }
}

export default CoreDatabaseService;