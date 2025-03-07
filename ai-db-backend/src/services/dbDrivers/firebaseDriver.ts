// src/services/dbDrivers/firebaseDriver.ts
import admin from "firebase-admin";
import logger from "../../config/logger";
import { ConnectionManager } from "../connectionmanager";
import { fetchDatabaseSchema } from "../ai.service";
import { fetchCloudCredentials } from "../cloudAuth.service";

export const connectFirebase = async (userId: number, dbType: string) => {
  try {
    const credentials = await fetchCloudCredentials(userId, dbType);
    if (!credentials || !credentials.auth_token) {
      throw new Error("❌ Missing credentials for Firebase connection.");
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(credentials.auth_token)),
      });
    }

    const firestore = admin.firestore();
    const connectionManager = new ConnectionManager(userId, dbType, { firestore });
    await connectionManager.connect(credentials);

    logger.info(`✅ Firebase connection established for User ${userId}`);

    await fetchDatabaseSchema(userId, dbType);
    return connectionManager;
  } catch (error) {
    logger.error(`❌ Firebase connection failed for User ${userId}: ${(error as Error).message}`);
    throw error;
  }
};
