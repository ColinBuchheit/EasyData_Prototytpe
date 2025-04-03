// src/modules/database/services/clients/sqliteClient.ts
import { IDatabaseClient, handleDatabaseError, HealthCheckResult } from "./interfaces";
import { UserDatabase } from "../../models/connection.model";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import logger from "../../../../config/logger";
import { connectWithRetry } from "../../../../shared/utils/connectionHelpers";
import { connectionCache, getConnectionKey } from "./adapter";

export const sqliteClient: IDatabaseClient = {
  async connect(db: UserDatabase) {
    const key = getConnectionKey(db);

    if (!connectionCache[key]) {
      const dbPath = db.host; // SQLite uses host field as file path

      if (!dbPath) {
        throw new Error("❌ Missing SQLite database path");
      }

      const connection = await connectWithRetry(
        async () => {
          const conn = await open({
            filename: dbPath,
            driver: sqlite3.Database
          });
          // Verify connection
          await conn.get("SELECT 1");
          return conn;
        },
        `SQLite (${db.connection_name || db.database_name})`
      );

      connectionCache[key] = connection;
    }

    return connectionCache[key];
  },

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const connection = await this.connect(db);

    try {
      const rows = await connection.all(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
      return rows.map((row: { name: any; }) => row.name);
    } catch (error: unknown) {
      const dbError = handleDatabaseError('fetchTables', error, 'SQLite');
      logger.error(`❌ Error fetching tables: ${dbError.message}`);
      throw dbError;
    }
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const connection = await this.connect(db);

    try {
      // Sanitize table name to prevent SQL injection
      const sanitizedTable = this.sanitizeInput(table);
      
      const rows = await connection.all(`PRAGMA table_info(${sanitizedTable})`);
      return rows;
    } catch (error: unknown) {
      const dbError = handleDatabaseError('fetchSchema', error, 'SQLite', table);
      logger.error(`❌ Error fetching schema for table ${table}: ${dbError.message}`);
      throw dbError;
    }
  },

  async runQuery(db: UserDatabase, query: string): Promise<any> {
    const connection = await this.connect(db);

    try {
      // Determine if this is a SELECT query or a modification
      const trimmedQuery = query.trim().toUpperCase();
      if (trimmedQuery.startsWith('SELECT') || trimmedQuery.startsWith('PRAGMA')) {
        const rows = await connection.all(query);
        return rows;
      } else {
        // For INSERT, UPDATE, DELETE, etc.
        const result = await connection.run(query);
        return {
          changes: result.changes,
          lastID: result.lastID
        };
      }
    } catch (error: unknown) {
      const dbError = handleDatabaseError('query', error, 'SQLite', query);
      logger.error(`❌ Error executing query: ${dbError.message}`);
      throw dbError;
    }
  },

  async disconnect(db: UserDatabase): Promise<void> {
    const key = getConnectionKey(db);
    const connection = connectionCache[key];

    if (connection) {
      try {
        await connection.close();
        delete connectionCache[key];
        logger.info(`✅ SQLite connection closed for ${db.connection_name || db.database_name}`);
      } catch (error: unknown) {
        const dbError = handleDatabaseError('disconnect', error, 'SQLite');
        logger.error(`❌ Error disconnecting from SQLite: ${dbError.message}`);
      }
    }
  },
  
  async beginTransaction(db: UserDatabase): Promise<any> {
    const connection = await this.connect(db);
    
    try {
      await connection.run('BEGIN TRANSACTION');
      return connection;
    } catch (error: unknown) {
      const dbError = handleDatabaseError('transaction', error, 'SQLite');
      logger.error(`❌ Error beginning SQLite transaction: ${dbError.message}`);
      throw dbError;
    }
  },

  async commitTransaction(transaction: any): Promise<void> {
    try {
      await transaction.run('COMMIT');
    } catch (error: unknown) {
      const dbError = handleDatabaseError('transaction', error, 'SQLite');
      logger.error(`❌ Error committing SQLite transaction: ${dbError.message}`);
      throw dbError;
    }
  },

  async rollbackTransaction(transaction: any): Promise<void> {
    try {
      await transaction.run('ROLLBACK');
    } catch (error: unknown) {
      const dbError = handleDatabaseError('transaction', error, 'SQLite');
      logger.error(`❌ Error rolling back SQLite transaction: ${dbError.message}`);
      // We don't throw here since this is already error handling
    }
  },

  async executeInTransaction(transaction: any, query: string): Promise<any> {
    try {
      // Determine if this is a SELECT query or a modification
      const trimmedQuery = query.trim().toUpperCase();
      if (trimmedQuery.startsWith('SELECT') || trimmedQuery.startsWith('PRAGMA')) {
        const rows = await transaction.all(query);
        return rows;
      } else {
        // For INSERT, UPDATE, DELETE, etc.
        const result = await transaction.run(query);
        return {
          changes: result.changes,
          lastID: result.lastID
        };
      }
    } catch (error: unknown) {
      const dbError = handleDatabaseError('query', error, 'SQLite', query);
      logger.error(`❌ Error executing SQLite query in transaction: ${dbError.message}`);
      throw dbError;
    }
  },

  async testConnection(db: UserDatabase): Promise<boolean> {
    try {
      const dbPath = db.host; // SQLite uses host field as file path
      
      if (!dbPath) {
        return false;
      }
      
      const connection = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      
      await connection.get("SELECT 1");
      await connection.close();
      
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`SQLite connection test failed: ${errorMessage}`);
      return false;
    }
  },

  async checkHealth(db: UserDatabase): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const dbPath = db.host; // SQLite uses host field as file path
      
      if (!dbPath) {
        return {
          isHealthy: false,
          latencyMs: 0,
          message: "Missing SQLite database path",
          timestamp: new Date()
        };
      }
      
      const connection = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      
      // Check if we can query the database
      const result = await connection.get("SELECT 1 as test");
      
      // Get some basic database information
      const pageSize = await connection.get("PRAGMA page_size");
      const pageCount = await connection.get("PRAGMA page_count");
      const dbSize = (pageSize.page_size * pageCount.page_count) / (1024 * 1024); // in MB
      
      await connection.close();
      
      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      
      return {
        isHealthy: result && result.test === 1,
        latencyMs,
        message: `SQLite database is accessible. Size: ${dbSize.toFixed(2)} MB`,
        timestamp: new Date()
      };
    } catch (error: unknown) {
      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        isHealthy: false,
        latencyMs,
        message: `Health check failed: ${errorMessage}`,
        timestamp: new Date()
      };
    }
  },

  // Utility function to sanitize inputs and prevent SQL injection
  sanitizeInput(input: string): string {
    if (!input) return '';
    
    // Remove potentially dangerous characters for SQLite
    return input
      .replace(/['"`\\%;]/g, '') // Remove quotes, semicolons, etc.
      .replace(/--/g, '')        // Remove comment markers
      .replace(/\/\*/g, '')      // Remove block comment markers
      .replace(/\*\//g, '')
      .trim();
  }
};