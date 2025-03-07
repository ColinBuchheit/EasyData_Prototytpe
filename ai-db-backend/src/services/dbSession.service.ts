import logger from "../config/logger";
import crypto from "crypto";
import { ConnectionManager } from "../services/connectionmanager";
import { refreshSchemaOnConnect } from "../services/ai.service";
import redisClient from "../config/redis";


interface SessionData {
  userId: number;
  dbType: string;
  createdAt: Date;
  expiresAt: Date;
}

const sessionStore: Record<string, SessionData> = {}; // Stores active sessions in memory
const sessionTimeouts: Record<string, NodeJS.Timeout> = {}; // Tracks auto-disconnect timers

const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30-minute session timeout

function generateSessionToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Creates a persistent database session for the user.
 */
export async function createPersistentDBSession(userId: number, dbType: string): Promise<{ sessionToken: string; expires_in: number }> {
  if (!ConnectionManager.isConnected(userId, dbType)) {
    throw new Error(`❌ User ${userId} does not have an active ${dbType} database connection.`);
  }

  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  sessionStore[sessionToken] = { userId, dbType, createdAt: new Date(), expiresAt };

  await redisClient.set(sessionToken, JSON.stringify(sessionStore[sessionToken]), { EX: SESSION_EXPIRY_MS / 1000 });

  logger.info(`✅ Created session for User ${userId} (DB: ${dbType}) - Expires in 30 mins`);
  await refreshSchemaOnConnect(userId, dbType);

  return { sessionToken, expires_in: SESSION_EXPIRY_MS / 1000 };
}

/**
 * ✅ Retrieves all active database sessions.
 */
export async function listActiveDBSessions(): Promise<any[]> {
  try {
    const keys = await redisClient.keys("*");
    const sessions = await Promise.all(keys.map(async (key) => {
      const sessionData = await redisClient.get(key);
      return sessionData ? JSON.parse(sessionData) : null;
    }));
    return sessions.filter((session) => session !== null);
  } catch (error) {
    logger.error(`❌ Failed to retrieve active sessions: ${(error as Error).message}`);
    return [];
  }
}


/**
 * Disconnects a database session manually or after timeout.
 */
export async function disconnectUserSession(sessionToken: string): Promise<void> {
  const session = sessionStore[sessionToken];

  if (!session) {
    logger.warn(`⚠️ Attempted to disconnect a non-existent session: ${sessionToken}`);
    return;
  }

  if (sessionTimeouts[sessionToken]) {
    clearTimeout(sessionTimeouts[sessionToken]);
    delete sessionTimeouts[sessionToken];
  }

  const { userId, dbType } = session;

  // ✅ Ensure user is connected before attempting to get an instance
  if (!ConnectionManager.isConnected(userId, dbType)) {
    logger.warn(`⚠️ No active connection found for User ${userId}. Skipping disconnect.`);
    return;
  }

  const connectionManager = ConnectionManager.getInstance(userId, dbType);
  await connectionManager.disconnect();

  logger.info(`✅ Session ${sessionToken} closed for User ${userId}`);
  delete sessionStore[sessionToken];
}
