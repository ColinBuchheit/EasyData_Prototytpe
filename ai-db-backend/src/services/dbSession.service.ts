import logger from "../config/logger";
import crypto from "crypto";
import { ConnectionManager } from "../services/connectionmanager";
import { refreshSchemaOnConnect } from "../services/ai.service";

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
  if (!ConnectionManager.isConnected(userId, dbType)) { // ✅ Validate dbType
    throw new Error(`❌ User ${userId} does not have an active ${dbType} database connection.`);
  }

  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  sessionStore[sessionToken] = {
    userId,
    dbType,
    createdAt: new Date(),
    expiresAt,
  };

  sessionTimeouts[sessionToken] = setTimeout(() => {
    disconnectUserSession(sessionToken);
  }, SESSION_EXPIRY_MS);

  logger.info(`✅ Created session for User ${userId} (DB: ${dbType}) - Expires in 30 mins`);

  try {
    logger.info(`🔄 Refreshing schema for User ${userId} (${dbType})...`);
    await refreshSchemaOnConnect(userId, dbType);
    logger.info(`✅ Schema refreshed for User ${userId} (${dbType})`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Failed to refresh schema for User ${userId}, DB: ${dbType}: ${err.message}`);
  }

  return { sessionToken, expires_in: SESSION_EXPIRY_MS / 1000 };
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

  // ✅ Use existing ConnectionManager instance
  const { userId, dbType } = session;
  const connectionManager = ConnectionManager.getInstance(userId, dbType);
  await connectionManager.disconnect();

  logger.info(`✅ Session ${sessionToken} closed for User ${userId}`);
  delete sessionStore[sessionToken];
}
