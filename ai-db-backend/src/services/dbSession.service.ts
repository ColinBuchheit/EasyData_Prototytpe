import logger from "../config/logger";
import crypto from "crypto";

interface SessionData {
  userId: number;
  dbType: string;
  createdAt: Date;
  expiresAt: Date;
}

const sessionStore: Record<string, SessionData> = {}; // Stores active sessions in memory
const sessionTimeouts: Record<string, NodeJS.Timeout> = {}; // Tracks auto-disconnect timers

const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30-minute session timeout

/**
 * Generates a unique session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Creates a persistent database session for the user.
 */
export async function createPersistentDBSession(userId: number, dbType: string): Promise<{ sessionToken: string; expires_in: number }> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  sessionStore[sessionToken] = {
    userId,
    dbType,
    createdAt: new Date(),
    expiresAt,
  };

  // ✅ Set timeout to disconnect session automatically after expiry
  sessionTimeouts[sessionToken] = setTimeout(() => {
    disconnectUserSession(sessionToken);
  }, SESSION_EXPIRY_MS);

  logger.info(`✅ Created session for User ${userId} (DB: ${dbType}) - Expires in 30 mins`);

  return { sessionToken, expires_in: SESSION_EXPIRY_MS / 1000 }; // Returns expiration in seconds
}

/**
 * Retrieves an active session, ensuring the user owns it.
 */
export async function getSession(userId: number, sessionToken: string): Promise<SessionData | null> {
  const session = sessionStore[sessionToken];
  if (!session) {
    logger.warn(`⚠️ Session ${sessionToken} not found.`);
    return null;
  }

  if (session.userId !== userId) {
    logger.warn(`🚫 Unauthorized access attempt by User ${userId} for session ${sessionToken}`);
    return null;
  }

  return session;
}

/**
 * Disconnects a database session manually or after timeout.
 */
export async function disconnectUserSession(sessionToken: string): Promise<void> {
  if (sessionTimeouts[sessionToken]) {
    clearTimeout(sessionTimeouts[sessionToken]);
    delete sessionTimeouts[sessionToken];
  }

  if (sessionStore[sessionToken]) {
    logger.info(`✅ Session ${sessionToken} closed.`);
    delete sessionStore[sessionToken];
  }
}
