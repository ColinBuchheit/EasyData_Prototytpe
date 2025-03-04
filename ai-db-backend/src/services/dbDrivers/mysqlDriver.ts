// src/services/dbDrivers/mysqlDriver.ts
import logger from "../../config/logger";
import { ConnectionManager } from "../connectionmanager";
import { fetchDatabaseSchema } from "../ai.service";
import { fetchCloudCredentials } from "../cloudAuth.service";

export const connectMySQL = async (userId: number, dbType: string, cloudProvider: string) => {
  try {
    const credentials = await fetchCloudCredentials(userId, dbType, cloudProvider);
    if (!credentials) {
      throw new Error("❌ Missing credentials for MySQL connection.");
    }

    const connectionManager = new ConnectionManager(userId, dbType, credentials);
    await connectionManager.connect(credentials);

    logger.info(`✅ MySQL connection established for User ${userId}`);

    await fetchDatabaseSchema(userId, dbType);
    return connectionManager;
  } catch (error) {
    logger.error(`❌ MySQL connection failed for User ${userId}: ${error}`);
    throw error;
  }
};
