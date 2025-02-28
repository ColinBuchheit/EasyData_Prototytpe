// src/services/connectionManager.ts
import logger from "../config/logger";
import { Pool as PostgresPool } from "pg";
import mysql, { Pool as MySQLPool } from "mysql2/promise";
import sql, { ConnectionPool as MSSQLPool } from "mssql";
import { Database as SQLiteDatabase } from "sqlite";

// Import database connection functions
import { connectPostgres } from "./dbDrivers/postgresDriver";
import { connectMySQL } from "./dbDrivers/mysqlDriver";
import { connectMSSQL } from "./dbDrivers/mssqlDriver";
import { connectSQLite } from "./dbDrivers/sqliteDriver";

// Import schema introspection functions
import { getPostgresSchema, getMySQLSchema, getMSSQLSchema, getSQLiteSchema } from "./schemaIntrospection";

export interface DBConfig {
  dbType: "postgres" | "mysql" | "mssql" | "sqlite";
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  maxConnections?: number; // ✅ Added connection pooling support
}

export class ConnectionManager {
  private connection: PostgresPool | MySQLPool | MSSQLPool | SQLiteDatabase | null = null;
  private config: DBConfig;
  private schema: Record<string, any> | null = null; // Schema as a structured object

  constructor(config: DBConfig) {
    if (!config.dbType || !config.host || !config.user || !config.database) {
      throw new Error("❌ Missing required database connection parameters.");
    }
    this.config = { ...config, maxConnections: config.maxConnections || 10 }; // ✅ Default max connections
  }

  /**
   * Establishes a database connection based on the provided configuration.
   */
  public async connect(): Promise<void> {
    try {
      if (this.isConnected()) {
        logger.warn(`⚠️ Already connected to ${this.config.dbType}. Reusing existing connection.`);
        return;
      }

      switch (this.config.dbType) {
        case "postgres":
          this.connection = await connectPostgres({ ...this.config, maxConnections: this.config.maxConnections });
          this.schema = await getPostgresSchema(this.connection as PostgresPool);
          break;
        case "mysql":
          this.connection = await connectMySQL({ ...this.config, maxConnections: this.config.maxConnections });
          this.schema = await getMySQLSchema(this.connection as MySQLPool);
          break;
        case "mssql":
          this.connection = await connectMSSQL({ ...this.config, maxConnections: this.config.maxConnections });
          this.schema = await getMSSQLSchema(this.connection as MSSQLPool);
          break;
        case "sqlite":
          this.connection = await connectSQLite(this.config);
          this.schema = await getSQLiteSchema(this.connection as SQLiteDatabase);
          break;
        default:
          throw new Error(`❌ Database type ${this.config.dbType} is not supported.`);
      }

      logger.info(`✅ Successfully connected to ${this.config.dbType} database.`);
    } catch (error) {
      logger.error(`❌ Failed to connect to ${this.config.dbType} database:`, error);
      throw error;
    }
  }

  /**
   * Disconnects from the active database connection.
   */
  public async disconnect(): Promise<void> {
    try {
      if (!this.connection) {
        logger.warn("⚠️ No active database connection to disconnect.");
        return;
      }

      switch (this.config.dbType) {
        case "postgres":
          await (this.connection as PostgresPool).end();
          break;
        case "mysql":
          await (this.connection as MySQLPool).end();
          break;
        case "mssql":
          await (this.connection as MSSQLPool).close();
          break;
        case "sqlite":
          await (this.connection as SQLiteDatabase).close();
          break;
        default:
          throw new Error(`❌ Database type ${this.config.dbType} is not supported.`);
      }

      logger.info(`✅ Disconnected from ${this.config.dbType} database.`);
      this.connection = null;
      this.schema = null;
    } catch (error) {
      logger.error(`❌ Error disconnecting from ${this.config.dbType} database:`, error);
      throw error;
    }
  }

  /**
   * Retrieves the database schema.
   */
  public getSchema(): Record<string, any> {
    if (!this.schema) {
      throw new Error("❌ No schema available. Connect to a database first.");
    }
    return this.schema;
  }

  /**
   * Checks if there is an active connection.
   */
  public isConnected(): boolean {
    return this.connection !== null;
  }

  /**
   * Automatically reconnects if the connection is lost.
   */
  public async reconnect(): Promise<void> {
    if (!this.isConnected()) {
      logger.warn(`🔄 Attempting to reconnect to ${this.config.dbType} database...`);
      await this.connect();
    }
  }
}
