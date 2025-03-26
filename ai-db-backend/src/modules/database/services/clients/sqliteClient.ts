// src/services/userdbClients/sqliteClient.ts
import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../../../models/userDatabase.model";
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
      const rows = await connection.all(`SELECT name FROM sqlite_master WHERE type='table'`);
      return rows.map((row: { name: any; }) => row.name);
    } catch (error) {
      logger.error(`❌ Error fetching tables: ${(error as Error).message}`);
      throw new Error(`Failed to fetch tables: ${(error as Error).message}`);
    }
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const connection = await this.connect(db);
    
    try {
      const rows = await connection.all(`PRAGMA table_info(${table})`);
      return rows;
    } catch (error) {
      logger.error(`❌ Error fetching schema for table ${table}: ${(error as Error).message}`);
      throw new Error(`Failed to fetch schema: ${(error as Error).message}`);
    }
  },

  async runQuery(db: UserDatabase, query: string): Promise<any> {
    const connection = await this.connect(db);
    
    try {
      const rows = await connection.all(query);
      return rows;
    } catch (error) {
      logger.error(`❌ Error executing query: ${(error as Error).message}`);
      throw new Error(`Query execution failed: ${(error as Error).message}`);
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
      } catch (error) {
        logger.error(`❌ Error disconnecting from SQLite: ${(error as Error).message}`);
      }
    }
  }
};