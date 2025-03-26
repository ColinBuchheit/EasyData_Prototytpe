// src/services/userdbClients/mysqlClient.ts
import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../../../models/userDatabase.model";
import mysql from "mysql2/promise";
import logger from "../../../../config/logger";
import { connectWithRetry } from "../../../../shared/utils/connectionHelpers";
import { connectionCache, getConnectionKey } from "./adapter";

function getConnectionConfig(db: UserDatabase): mysql.ConnectionOptions {
  if (!db.host || !db.port || !db.username || !db.encrypted_password || !db.database_name) {
    throw new Error("❌ Missing MySQL connection fields.");
  }

  return {
    host: db.host,
    port: db.port,
    user: db.username,
    password: db.encrypted_password,
    database: db.database_name,
  };
}

export const mysqlClient: IDatabaseClient = {
  async connect(db: UserDatabase) {
    const key = getConnectionKey(db);
    
    if (!connectionCache[key]) {
      const connection = await connectWithRetry(
        async () => {
          const conn = await mysql.createConnection(getConnectionConfig(db));
          // Verify connection
          await conn.query("SELECT 1");
          return conn;
        },
        `MySQL (${db.connection_name || db.database_name})`
      );
      
      connectionCache[key] = connection;
    }
    
    return connectionCache[key];
  },

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const connection = await this.connect(db);
    
    try {
      const [rawRows] = await connection.query("SHOW TABLES");
      const rows = rawRows as Record<string, any>[];
      const tableKey = Object.keys(rows[0])[0]; // e.g., "Tables_in_mydb"
      
      return rows.map(row => row[tableKey]);
    } catch (error) {
      logger.error(`❌ Error fetching tables: ${(error as Error).message}`);
      throw new Error(`Failed to fetch tables: ${(error as Error).message}`);
    }
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const connection = await this.connect(db);
    
    try {
      const [rows] = await connection.query(`DESCRIBE \`${table}\``);
      return rows;
    } catch (error) {
      logger.error(`❌ Error fetching schema for table ${table}: ${(error as Error).message}`);
      throw new Error(`Failed to fetch schema: ${(error as Error).message}`);
    }
  },

  async runQuery(db: UserDatabase, query: string): Promise<any> {
    const connection = await this.connect(db);
    
    try {
      const [rows] = await connection.query(query);
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
        await connection.end();
        delete connectionCache[key];
        logger.info(`✅ MySQL connection closed for ${db.connection_name || db.database_name}`);
      } catch (error) {
        logger.error(`❌ Error disconnecting from MySQL: ${(error as Error).message}`);
      }
    }
  }
};