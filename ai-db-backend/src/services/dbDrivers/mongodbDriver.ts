// src/services/dbDrivers/mongodbDriver.ts
import { MongoClient } from "mongodb";
import logger from "../../config/logger";
import { ConnectionManager } from "../connectionmanager";
import { fetchDatabaseSchema } from "../ai.service";
import { fetchCloudCredentials } from "../cloudAuth.service";

export const connectMongoDB = async (userId: number, dbType: string) => {
  try {
    const credentials = await fetchCloudCredentials(userId, dbType);
    if (!credentials || !credentials.connection_uri) {
      throw new Error("❌ Missing credentials for MongoDB connection.");
    }

    const client = new MongoClient(credentials.connection_uri);
    await client.connect();

    const connectionManager = new ConnectionManager(userId, dbType, { client });
    await connectionManager.connect(credentials);

    logger.info(`✅ MongoDB connection established for User ${userId}`);

    await fetchDatabaseSchema(userId, dbType);
    return connectionManager;
  } catch (error) {
    logger.error(`❌ MongoDB connection failed for User ${userId}: ${(error as Error).message}`);
    throw error;
  }
};
