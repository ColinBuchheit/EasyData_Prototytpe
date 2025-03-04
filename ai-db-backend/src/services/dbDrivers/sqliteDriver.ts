// src/services/dbDrivers/sqliteDriver.ts
import logger from "../../config/logger";
import { ConnectionManager } from "../connectionmanager";
import { fetchDatabaseSchema } from "../ai.service";
import { fetchCloudCredentials } from "../cloudAuth.service";

export const connectSQLite = async (userId: number, dbType: string, cloudProvider: string) => {
  try {
    const credentials = await fetchCloudCredentials(userId, dbType, cloudProvider);
    if (!credentials) {
      throw new Error("❌ Missing credentials for SQLite connection.");
    }

    const connectionManager = new ConnectionManager(userId, dbType, credentials);
    await connectionManager.connect(credentials);

    logger.info(`✅ SQLite connection established for User ${userId}`);

    await fetchDatabaseSchema(userId, dbType);
    return connectionManager;
  } catch (error) {
    logger.error(`❌ SQLite connection failed for User ${userId}: ${error}`);
    throw error;
  }
};
