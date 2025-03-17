// src/services/dbDrivers/couchdbDriver.ts
import nano from "nano";
import logger from "../../config/logger";
import { ConnectionManager } from "../connectionmanager";
import { fetchDatabaseSchema } from "../ai.service";
import { fetchCloudCredentials } from "../cloudAuth.service";

export const connectCouchDB = async (userId: number, dbType: string) => {
  try {
    const credentials = await fetchCloudCredentials(userId, dbType);
    if (!credentials || !credentials.connection_uri) {
      throw new Error("❌ Missing credentials for CouchDB connection.");
    }

    const couch = nano(credentials.connection_uri);
    const connectionManager = new ConnectionManager(userId, dbType, { couch });
    await connectionManager.connect(credentials);

    logger.info(`✅ CouchDB connection established for User ${userId}`);

    await fetchDatabaseSchema(userId, dbType);
    return connectionManager;
  } catch (error) {
    logger.error(`❌ CouchDB connection failed for User ${userId}: ${(error as Error).message}`);
    throw error;
  }
};
