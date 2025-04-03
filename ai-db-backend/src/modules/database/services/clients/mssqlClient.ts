// src/modules/database/services/clients/mssqlClient.ts
import { IDatabaseClient, handleDatabaseError, HealthCheckResult } from "./interfaces";
import { UserDatabase } from "../../models/connection.model";
import sql from "mssql";
import logger from "../../../../config/logger";
import { connectWithRetry } from "../../../../shared/utils/connectionHelpers";
import { connectionCache, getConnectionKey } from "./adapter";

function getConfig(db: UserDatabase): sql.config {
  if (!db.host || !db.port || !db.username || !db.encrypted_password || !db.database_name) {
    throw new Error("❌ Missing MSSQL connection fields.");
  }

  return {
    user: db.username,
    password: db.encrypted_password, // Already decrypted by ConnectionService
    server: db.host,
    port: db.port,
    database: db.database_name,
    options: {
      encrypt: false, // Set to true if you're connecting to Azure
      trustServerCertificate: true,
    },
    // Add timeouts
    connectionTimeout: 15000,
    requestTimeout: 15000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
}

// Rest of the MSSQL client implementation...

export const mssqlClient: IDatabaseClient = {
  async connect(db: UserDatabase) {
    const key = getConnectionKey(db);

    if (!connectionCache[key]) {
      const pool = await connectWithRetry(
        async () => {
          const p = await sql.connect(getConfig(db));
          // Verify connection
          await p.request().query("SELECT 1");
          return p;
        },
        `MSSQL (${db.connection_name || db.database_name})`
      );

      connectionCache[key] = pool;
    }

    return connectionCache[key];
  },

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const pool = await this.connect(db);

    try {
      const result = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'
      `);
      return result.recordset.map((r: any) => r.TABLE_NAME);
    } catch (error) {
      logger.error(`❌ Error fetching tables: ${(error as Error).message}`);
      throw new Error(`Failed to fetch tables: ${(error as Error).message}`);
    }
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const pool = await this.connect(db);

    try {
      const result = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${table}'
      `);
      return result.recordset;
    } catch (error) {
      logger.error(`❌ Error fetching schema for table ${table}: ${(error as Error).message}`);
      throw new Error(`Failed to fetch schema: ${(error as Error).message}`);
    }
  },

  async runQuery(db: UserDatabase, query: string): Promise<any> {
    const pool = await this.connect(db);

    try {
      const result = await pool.request().query(query);
      return result.recordset;
    } catch (error) {
      logger.error(`❌ Error executing query: ${(error as Error).message}`);
      throw new Error(`Query execution failed: ${(error as Error).message}`);
    }
  },

  async disconnect(db: UserDatabase): Promise<void> {
    const key = getConnectionKey(db);
    const pool = connectionCache[key];

    if (pool) {
      try {
        await pool.close();
        delete connectionCache[key];
        logger.info(`✅ MSSQL connection closed for ${db.connection_name || db.database_name}`);
      } catch (error) {
        logger.error(`❌ Error disconnecting from MSSQL: ${(error as Error).message}`);
      }
    }
  },
  testConnection: function (db: UserDatabase): Promise<boolean> {
    throw new Error("Function not implemented.");
  },
  sanitizeInput: function (input: string): string {
    throw new Error("Function not implemented.");
  }
};