// src/modules/database/services/clients/postgresClient.ts
import { IDatabaseClient, handleDatabaseError, HealthCheckResult } from "./interfaces";
import { UserDatabase } from "../../models/connection.model";
import { Client, Pool } from "pg";
import logger from "../../../../config/logger";
import { connectWithRetry } from "../../../../shared/utils/connectionHelpers";
import { connectionCache, getConnectionKey } from "./adapter";

function getConfig(db: UserDatabase) {
  if (!db.host || !db.port || !db.username || !db.encrypted_password || !db.database_name) {
    throw new Error("❌ Missing PostgreSQL connection fields.");
  }

  return {
    host: db.host,
    port: db.port,
    user: db.username,
    password: db.encrypted_password, // ConnectionService now handles decryption
    database: db.database_name,
    // Add timeouts for better error handling
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  };
}

export const postgresClient: IDatabaseClient = {
  async connect(db: UserDatabase) {
    const key = getConnectionKey(db);

    if (!connectionCache[key]) {
      try {
        const client = await connectWithRetry(
          async () => {
            const c = new Client(getConfig(db));
            await c.connect();
            // Verify connection with a simple query
            await c.query("SELECT 1");
            return c;
          },
          `PostgreSQL (${db.connection_name || db.database_name})`
        );
        
        connectionCache[key] = client;
      } catch (error: unknown) {
        const dbError = handleDatabaseError('connect', error, 'PostgreSQL');
        logger.error(`❌ PostgreSQL connection error: ${dbError.message}`);
        throw dbError;
      }
    }

    return connectionCache[key];
  },

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const client = await this.connect(db);

    try {
      const res = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      return res.rows.map((row: { table_name: any; }) => row.table_name);
    } catch (error: unknown) {
      const dbError = handleDatabaseError('fetchTables', error, 'PostgreSQL');
      logger.error(`❌ Error fetching PostgreSQL tables: ${dbError.message}`);
      throw dbError;
    }
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const client = await this.connect(db);

    try {
      // Sanitize table name to prevent SQL injection
      const sanitizedTable = this.sanitizeInput(table);
      
      const res = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
        [sanitizedTable]
      );
      return res.rows;
    } catch (error: unknown) {
      const dbError = handleDatabaseError('fetchSchema', error, 'PostgreSQL', table);
      logger.error(`❌ Error fetching schema for PostgreSQL table ${table}: ${dbError.message}`);
      throw dbError;
    }
  },

  async runQuery(db: UserDatabase, query: string): Promise<any> {
    const client = await this.connect(db);

    try {
      const res = await client.query(query);
      return res.rows;
    } catch (error: unknown) {
      const dbError = handleDatabaseError('query', error, 'PostgreSQL', query);
      logger.error(`❌ Error executing PostgreSQL query: ${dbError.message}`);
      throw dbError;
    }
  },

  async disconnect(db: UserDatabase): Promise<void> {
    const key = getConnectionKey(db);
    const client = connectionCache[key];

    if (client) {
      try {
        await client.end();
        delete connectionCache[key];
        logger.info(`✅ PostgreSQL connection closed for ${db.connection_name || db.database_name}`);
      } catch (error: unknown) {
        const dbError = handleDatabaseError('disconnect', error, 'PostgreSQL');
        logger.error(`❌ Error disconnecting from PostgreSQL: ${dbError.message}`);
      }
    }
  },

  // Add transaction support methods
  async beginTransaction(db: UserDatabase): Promise<any> {
    const client = await this.connect(db);
    
    try {
      await client.query('BEGIN');
      return client;
    } catch (error: unknown) {
      const dbError = handleDatabaseError('transaction', error, 'PostgreSQL');
      logger.error(`❌ Error beginning PostgreSQL transaction: ${dbError.message}`);
      throw dbError;
    }
  },

  async executeInTransaction(transaction: any, query: string): Promise<any> {
    try {
      const result = await transaction.query(query);
      return result.rows;
    } catch (error: unknown) {
      const dbError = handleDatabaseError('query', error, 'PostgreSQL', query);
      logger.error(`❌ Error executing PostgreSQL query in transaction: ${dbError.message}`);
      throw dbError; // Don't wrap the error so rollback can be triggered
    }
  },

  async commitTransaction(transaction: any): Promise<void> {
    try {
      await transaction.query('COMMIT');
    } catch (error: unknown) {
      const dbError = handleDatabaseError('transaction', error, 'PostgreSQL');
      logger.error(`❌ Error committing PostgreSQL transaction: ${dbError.message}`);
      throw dbError;
    }
  },

  async rollbackTransaction(transaction: any): Promise<void> {
    try {
      await transaction.query('ROLLBACK');
    } catch (error: unknown) {
      const dbError = handleDatabaseError('transaction', error, 'PostgreSQL');
      logger.error(`❌ Error rolling back PostgreSQL transaction: ${dbError.message}`);
      // We don't throw here as this is already error handling
    }
  },

  async testConnection(db: UserDatabase): Promise<boolean> {
    try {
      const client = new Client(getConfig(db));
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`PostgreSQL connection test failed: ${errorMessage}`);
      return false;
    }
  },
  
  async checkHealth(db: UserDatabase): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const client = new Client(getConfig(db));
      await client.connect();
      
      // Get basic server info
      const versionResult = await client.query('SELECT version()');
      const activeConnectionsResult = await client.query('SELECT count(*) FROM pg_stat_activity');
      
      await client.end();
      
      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      
      const version = versionResult.rows[0].version;
      const activeConnections = activeConnectionsResult.rows[0].count;
      
      return {
        isHealthy: true,
        latencyMs,
        message: `PostgreSQL server healthy. Version: ${version.split(',')[0]}. Active connections: ${activeConnections}`,
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
    
    // Remove potentially dangerous characters
    return input
      .replace(/['"`\\%;]/g, '') // Remove quotes, semicolons, etc.
      .replace(/--/g, '')        // Remove comment markers
      .replace(/\/\*/g, '')      // Remove block comment markers
      .replace(/\*\//g, '')
      .trim();
  }
};