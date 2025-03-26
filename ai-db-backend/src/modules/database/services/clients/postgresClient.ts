// src/services/userdbClients/postgresClient.ts
import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../../../models/userDatabase.model";
import { Client } from "pg";
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
    password: db.encrypted_password,
    database: db.database_name,
  };
}

export const postgresClient: IDatabaseClient = {
  async connect(db: UserDatabase) {
    const key = getConnectionKey(db);
    
    if (!connectionCache[key]) {
      const client = new Client(getConfig(db));
      
      await connectWithRetry(
        async () => {
          await client.connect();
          // Verify connection with a simple query
          await client.query("SELECT 1");
        },
        `PostgreSQL (${db.connection_name || db.database_name})`
      );
      
      connectionCache[key] = client;
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
    } catch (error) {
      logger.error(`❌ Error fetching tables: ${(error as Error).message}`);
      throw new Error(`Failed to fetch tables: ${(error as Error).message}`);
    }
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const client = await this.connect(db);
    
    try {
      const res = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
        [table]
      );
      return res.rows;
    } catch (error) {
      logger.error(`❌ Error fetching schema for table ${table}: ${(error as Error).message}`);
      throw new Error(`Failed to fetch schema: ${(error as Error).message}`);
    }
  },

  async runQuery(db: UserDatabase, query: string): Promise<any> {
    const client = await this.connect(db);
    
    try {
      const res = await client.query(query);
      return res.rows;
    } catch (error) {
      logger.error(`❌ Error executing query: ${(error as Error).message}`);
      throw new Error(`Query execution failed: ${(error as Error).message}`);
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
      } catch (error) {
        logger.error(`❌ Error disconnecting from PostgreSQL: ${(error as Error).message}`);
      }
    }
  }
};