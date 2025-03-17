// src/services/dbDrivers/dynamodbDriver.ts
import AWS from "aws-sdk";
import logger from "../../config/logger";
import { ConnectionManager } from "../connectionmanager";
import { fetchDatabaseSchema } from "../ai.service";
import { fetchCloudCredentials } from "../cloudAuth.service";

export const connectDynamoDB = async (userId: number, dbType: string) => {
  try {
    const credentials = await fetchCloudCredentials(userId, dbType);
    if (!credentials || !credentials.auth_token) {
      throw new Error("❌ Missing credentials for DynamoDB connection.");
    }

    AWS.config.update({
      region: credentials.region,
      accessKeyId: credentials.access_key,
      secretAccessKey: credentials.secret_key,
    });

    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const connectionManager = new ConnectionManager(userId, dbType, { dynamoDB });
    await connectionManager.connect(credentials);

    logger.info(`✅ DynamoDB connection established for User ${userId}`);

    await fetchDatabaseSchema(userId, dbType);
    return connectionManager;
  } catch (error) {
    logger.error(`❌ DynamoDB connection failed for User ${userId}: ${(error as Error).message}`);
    throw error;
  }
};
