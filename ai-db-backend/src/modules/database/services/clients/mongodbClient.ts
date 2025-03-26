// src/services/userdbClients/mongodbClient.ts
import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../../../models/userDatabase.model";
import { MongoClient } from "mongodb";
import logger from "../../../../config/logger";
import { connectWithRetry } from "../../../../shared/utils/connectionHelpers";
import { connectionCache, getConnectionKey } from "./adapter";

function getConnectionUri(db: UserDatabase): string {
  if (!db.host || !db.port || !db.username || !db.encrypted_password || !db.database_name) {
    throw new Error("❌ Missing MongoDB connection fields.");
  }
  
  return `mongodb://${db.username}:${db.encrypted_password}@${db.host}:${db.port}/${db.database_name}`;
}

export const mongodbClient: IDatabaseClient = {
  async connect(db: UserDatabase) {
    const key = getConnectionKey(db);
    
    if (!connectionCache[key]) {
      const uri = getConnectionUri(db);
      
      const client = await connectWithRetry(
        async () => {
          const mongoClient = new MongoClient(uri);
          await mongoClient.connect();
          // Verify connection
          await mongoClient.db().admin().ping();
          return mongoClient;
        },
        `MongoDB (${db.connection_name || db.database_name})`
      );
      
      connectionCache[key] = client;
    }
    
    return connectionCache[key];
  },

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const client = await this.connect(db);
    
    try {
      const collections = await client.db().listCollections().toArray();
      return collections.map((col: { name: any; }) => col.name);
    } catch (error) {
      logger.error(`❌ Error fetching MongoDB collections: ${(error as Error).message}`);
      throw new Error(`Failed to fetch collections: ${(error as Error).message}`);
    }
  },

  async fetchSchema(db: UserDatabase, collection: string): Promise<any> {
    const client = await this.connect(db);
    
    try {
      const doc = await client.db().collection(collection).findOne();
      return doc ? Object.keys(doc).map(key => ({ field: key, type: typeof doc[key] })) : [];
    } catch (error) {
      logger.error(`❌ Error fetching schema for collection ${collection}: ${(error as Error).message}`);
      throw new Error(`Failed to fetch schema: ${(error as Error).message}`);
    }
  },

  async runQuery(db: UserDatabase, query: any): Promise<any> {
    const client = await this.connect(db);
    
    try {
      const collection = query.collection || query.table;
      const filter = query.filter || {};
      const options = query.options || {};
      
      const result = await client.db().collection(collection).find(filter, options).toArray();
      return result;
    } catch (error) {
      logger.error(`❌ Error executing MongoDB query: ${(error as Error).message}`);
      throw new Error(`Query execution failed: ${(error as Error).message}`);
    }
  },
  
  async disconnect(db: UserDatabase): Promise<void> {
    const key = getConnectionKey(db);
    const client = connectionCache[key];
    
    if (client) {
      try {
        await client.close();
        delete connectionCache[key];
        logger.info(`✅ MongoDB connection closed for ${db.connection_name || db.database_name}`);
      } catch (error) {
        logger.error(`❌ Error disconnecting from MongoDB: ${(error as Error).message}`);
      }
    }
  }
};