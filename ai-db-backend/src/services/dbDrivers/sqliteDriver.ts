// src/services/dbDrivers/sqliteDriver.ts
import { requestDatabaseSession } from '../ai.service'; // ✅ AI-Agent Session Handling
import logger from '../../config/logger';

export const connectSQLite = async (userId: number, dbType: string) => {
  try {
    // ✅ Request an AI-Agent session instead of using credentials
    const session = await requestDatabaseSession(userId, dbType, "session"); // ✅ Specify session-based access
    logger.info(`✅ AI-Agent SQLite session established. Session Token: ${session.sessionToken}`);
    return session;
  } catch (error) {
    logger.error('❌ Failed to create SQLite session via AI-Agent:', error);
    throw error;
  }
};
