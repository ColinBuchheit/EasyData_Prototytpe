// src/services/dbDrivers/mssqlDriver.ts
import logger from "../../config/logger";
import { ConnectionManager } from "../connectionmanager";
import { fetchDatabaseSchema } from "../ai.service";
import { fetchCloudCredentials } from "../cloudAuth.service"; // ✅ Import secure credentials retrieval

export const connectMSSQL = async (userId: number, dbType: string, cloudProvider: string) => {
  try {
    // ✅ Fetch credentials securely before connecting
    const credentials = await fetchCloudCredentials(userId, dbType, cloudProvider);
    if (!credentials) {
      throw new Error("❌ Missing credentials for database connection.");
    }

    // ✅ Ensure credentials are passed when getting an instance
    const connectionManager = new ConnectionManager(userId, dbType, credentials);
    await connectionManager.connect(credentials);

    logger.info(`✅ MSSQL connection established for User ${userId}`);

    // ✅ Fetch schema after connecting
    await fetchDatabaseSchema(userId, dbType);

    return connectionManager;
  } catch (error) {
    const err = error as Error;
    logger.error(`❌ MSSQL connection failed for User ${userId}: ${err.message}`);
    throw error;
  }
};
