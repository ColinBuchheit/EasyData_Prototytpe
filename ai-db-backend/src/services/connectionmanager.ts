import logger from "../config/logger";
import { requestDatabaseSession, fetchDatabaseSchema, disconnectDatabaseSession } from "../services/ai.service"; // ✅ AI-Agent Calls
import { getSession } from "../services/dbSession.service"; // ✅ Session Validation
import pool from "../config/db"; // ✅ Access DB for credentials
import { decrypt } from "../utils/encryption"; // ✅ Decrypt stored credentials if needed
import { validateAISession } from "../services/ai.service";


export class ConnectionManager {
  private dbType: string;
  private sessionToken: string | null = null;

  constructor(dbType: string) {
    this.dbType = dbType;
  }

  /**
   * Fetch user database credentials and request an AI-Agent session.
   */
  public async connect(userId: number): Promise<void> {
    try {
      const { rows } = await pool.query(
        `SELECT auth_method, host, port, username, encrypted_password 
         FROM user_databases WHERE user_id = $1 AND db_type = $2`,
        [userId, this.dbType]
      );

      if (rows.length === 0) {
        throw new Error("❌ No database credentials found.");
      }

      const { auth_method, host, port, username, encrypted_password } = rows[0];

      if (auth_method === "stored") {
        if (!host || !port || !username || !encrypted_password) {
          throw new Error("❌ Missing stored credentials.");
        }

        const password = decrypt(encrypted_password); // ✅ Decrypt password securely

        // ✅ Send credentials to AI-Agent for session-based access
        const session = await requestDatabaseSession(userId, this.dbType, auth_method, host, port, username, password);

        this.sessionToken = session.sessionToken;
        logger.info(`✅ AI-Agent session established using stored credentials for ${this.dbType} (Session Token: ${this.sessionToken})`);
      } else {
        // ✅ Use session-based access (AI-Agent handles authentication dynamically)
        const session = await requestDatabaseSession(userId, this.dbType, auth_method); // ✅ Pass authMethod explicitly

        this.sessionToken = session.sessionToken;
        logger.info(`✅ AI-Agent session established using temporary session for ${this.dbType} (Session Token: ${this.sessionToken})`);
      }
    } catch (error) {
      const err = error as Error; // ✅ Fix: Explicitly cast error
      logger.error(`❌ Failed to create AI-Agent session:`, err.message);
      throw err;
    }
  }

  /**
   * Retrieves the database schema using AI-Agent.
   */
  public async getSchema(): Promise<Record<string, any>> {
    if (!this.sessionToken) {
      throw new Error("❌ No active session token.");
    }

    return await fetchDatabaseSchema(this.sessionToken);
  }

  /**
   * Validates if the session is still active.
   */
  
 
public async validateSession(userId: number): Promise<boolean> {
  if (!this.sessionToken) {
    logger.warn("⚠️ No active session to validate.");
    return false;
  }

  const isValid = await validateAISession(this.sessionToken);
  if (!isValid) {
    logger.warn(`⚠️ Session ${this.sessionToken} is no longer valid.`);
    this.sessionToken = null;
    return false;
  }

  return true;
}
  

  /**
   * Returns the current session token (Read-Only Access)
   */
  public getSessionToken(): string | null {
    return this.sessionToken;
  }

  /**
   * Disconnects the database session via AI-Agent.
   */
  public async disconnect(): Promise<void> {
    if (!this.sessionToken) {
      logger.warn("⚠️ No active session to disconnect.");
      return;
    }

    try {
      await disconnectDatabaseSession(this.sessionToken);
      this.sessionToken = null;
      logger.info(`✅ AI-Agent session closed for ${this.dbType}.`);
    } catch (error) {
      const err = error as Error; // ✅ Fix: Explicitly cast error
      logger.error(`❌ AI-Agent failed to disconnect:`, err.message);
      throw err;
    }
  }
}
