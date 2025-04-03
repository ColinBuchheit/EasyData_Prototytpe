// src/modules/database/services/clients/couchdbClient.ts
import { IDatabaseClient, handleDatabaseError, HealthCheckResult } from "./interfaces";
import { UserDatabase } from "../../models/connection.model";
import nano from "nano";
import logger from "../../../../config/logger";
import { connectWithRetry } from "../../../../shared/utils/connectionHelpers";
import { connectionCache, getConnectionKey } from "./adapter";

function getCouchDbUrl(db: UserDatabase): string {
  if (!db.host || !db.port || !db.username || !db.encrypted_password) {
    throw new Error("❌ Missing CouchDB connection fields.");
  }
  
  // Use the already-decrypted password from ConnectionService
  return `http://${db.username}:${encodeURIComponent(db.encrypted_password)}@${db.host}:${db.port}`;
}

// Rest of the CouchDB client implementation...

export const couchdbClient: IDatabaseClient = {
  async connect(db: UserDatabase) {
    const key = getConnectionKey(db);

    if (!connectionCache[key]) {
      const url = getCouchDbUrl(db);

      const client = await connectWithRetry(
        async () => {
          const couchClient = nano(url);
          // Verify connection
          await couchClient.db.list();
          return couchClient;
        },
        `CouchDB (${db.connection_name || db.database_name})`
      );

      connectionCache[key] = client;
    }

    return connectionCache[key];
  },

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const couch = await this.connect(db);

    try {
      const databases = await couch.db.list();
      return databases;
    } catch (error) {
      logger.error(`❌ Error fetching CouchDB databases: ${(error as Error).message}`);
      throw new Error(`Failed to fetch databases: ${(error as Error).message}`);
    }
  },

  async fetchSchema(db: UserDatabase, dbName: string): Promise<any> {
    const couch = await this.connect(db);

    try {
      const dbInstance = couch.use(dbName);
      const result = await dbInstance.find({ selector: {}, limit: 1 });

      if (!result.docs.length) return [];

      return Object.keys(result.docs[0]).map(key => ({
        field: key,
        type: typeof result.docs[0][key]
      }));
    } catch (error) {
      logger.error(`❌ Error fetching schema for database ${dbName}: ${(error as Error).message}`);
      throw new Error(`Failed to fetch schema: ${(error as Error).message}`);
    }
  },

  async runQuery(db: UserDatabase, query: any): Promise<any> {
    const couch = await this.connect(db);

    try {
      const dbName = query.database || query.collection || query.table;
      const dbInstance = couch.use(dbName);

      // Handle different query types
      if (query.selector) {
        // Mango query
        return await dbInstance.find(query);
      } else if (query.view) {
        // View query
        return await dbInstance.view(query.design, query.view, query.params || {});
      } else if (query.id) {
        // Document lookup
        return await dbInstance.get(query.id);
      } else {
        // Default to all docs
        return await dbInstance.list({ include_docs: true });
      }
    } catch (error) {
      logger.error(`❌ Error executing CouchDB query: ${(error as Error).message}`);
      throw new Error(`Query execution failed: ${(error as Error).message}`);
    }
  },

  async disconnect(db: UserDatabase): Promise<void> {
    const key = getConnectionKey(db);

    if (connectionCache[key]) {
      // CouchDB doesn't have an explicit disconnect method
      delete connectionCache[key];
      logger.info(`✅ CouchDB connection removed for ${db.connection_name || db.database_name}`);
    }
  },
  testConnection: function (db: UserDatabase): Promise<boolean> {
    throw new Error("Function not implemented.");
  },
  sanitizeInput: function (input: string): string {
    throw new Error("Function not implemented.");
  }
};