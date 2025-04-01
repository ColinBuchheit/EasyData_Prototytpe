// src/modules/database/services/clients/firebaseClient.ts
import { IDatabaseClient, handleDatabaseError, HealthCheckResult } from "./interfaces";
import { UserDatabase } from "../../models/connection.model";
import * as admin from "firebase-admin";
import logger from "../../../../config/logger";
import { connectionCache, getConnectionKey } from "./adapter";

function getFirebaseApp(db: UserDatabase): admin.app.App {
  const key = getConnectionKey(db);
  
  if (!connectionCache[key]) {
    if (!db.encrypted_password) {
      throw new Error("❌ Missing Firebase credentials.");
    }
    
    try {
      // For Firebase, the encrypted_password field contains the credentials JSON
      // It should already be decrypted by the ConnectionService
      const credential = admin.credential.cert(
        JSON.parse(db.encrypted_password)
      );
      
      connectionCache[key] = admin.initializeApp({ credential }, key);
      logger.info(`✅ Firebase connection established for ${db.connection_name || db.database_name}`);
    } catch (error: unknown) {
      const dbError = handleDatabaseError('connect', error, 'Firebase');
      logger.error(`❌ Error initializing Firebase app: ${dbError.message}`);
      throw dbError;
    }
  }
  
  return connectionCache[key];
}

// Rest of the Firebase client implementation...

export const firebaseClient: IDatabaseClient = {
  async connect(db: UserDatabase) {
    return getFirebaseApp(db);
  },

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const app = await this.connect(db);

    try {
      const firestore = app.firestore();
      const collections = await firestore.listCollections();
      return collections.map((c: { id: any; }) => c.id);
    } catch (error) {
      logger.error(`❌ Error fetching Firebase collections: ${(error as Error).message}`);
      throw new Error(`Failed to fetch collections: ${(error as Error).message}`);
    }
  },

  async fetchSchema(db: UserDatabase, collection: string): Promise<any> {
    const app = await this.connect(db);

    try {
      const firestore = app.firestore();
      const snapshot = await firestore.collection(collection).limit(1).get();

      if (snapshot.empty) return [];

      const data = snapshot.docs[0].data();
      return Object.keys(data).map(key => ({ field: key, type: typeof data[key] }));
    } catch (error) {
      logger.error(`❌ Error fetching schema for collection ${collection}: ${(error as Error).message}`);
      throw new Error(`Failed to fetch schema: ${(error as Error).message}`);
    }
  },

  async runQuery(db: UserDatabase, query: any): Promise<any> {
    const app = await this.connect(db);

    try {
      const firestore = app.firestore();
      const collectionName = query.collection || query.table;
      let ref = firestore.collection(collectionName);

      // Apply filters if present
      if (query.where) {
        for (const filter of query.where) {
          ref = ref.where(filter.field, filter.operator, filter.value);
        }
      }

      // Apply limit if specified
      if (query.limit) {
        ref = ref.limit(query.limit);
      }

      const snapshot = await ref.get();
      return snapshot.docs.map((doc: { id: any; data: () => any; }) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error(`❌ Error executing Firebase query: ${(error as Error).message}`);
      throw new Error(`Query execution failed: ${(error as Error).message}`);
    }
  },

  async disconnect(db: UserDatabase): Promise<void> {
    const key = getConnectionKey(db);
    const app = connectionCache[key];

    if (app) {
      try {
        await app.delete();
        delete connectionCache[key];
        logger.info(`✅ Firebase app deleted for ${db.connection_name || db.database_name}`);
      } catch (error) {
        logger.error(`❌ Error deleting Firebase app: ${(error as Error).message}`);
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