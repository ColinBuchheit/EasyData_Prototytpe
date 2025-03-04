import logger from "../config/logger";
import { fetchDatabaseSchema } from "../services/ai.service"; // ✅ Ensures AI-Agent gets schema

// ✅ Active connections storage
const activeConnections: Map<number, ConnectionManager> = new Map();

export class ConnectionManager {
  private userId: number;
  private dbType: string;
  private credentials: any;

  constructor(userId: number, dbType: string, credentials: any) {
    this.userId = userId;
    this.dbType = dbType;
    this.credentials = credentials;
  }

  /**
   * ✅ Checks if a user is connected to a database.
   */
  public static isConnected(userId: number, dbType: string): boolean {
    return activeConnections.has(userId) && activeConnections.get(userId)?.dbType === dbType;
  }

  /**
   * ✅ Ensures a single instance per user per database type.
   */
  public static getInstance(userId: number, dbType: string): ConnectionManager {
    if (!activeConnections.has(userId)) {
      throw new Error(`❌ No active connection found for user ${userId}.`);
    }
    return activeConnections.get(userId)!;
  }

  /**
   * ✅ Connects the user to a database using secure credentials.
   */
  public async connect(credentials: any): Promise<void> {
    if (ConnectionManager.isConnected(this.userId, this.dbType)) {
      logger.info(`⚡ User ${this.userId} is already connected to ${this.dbType}.`);
      return;
    }

    try {
      // ✅ Use externally fetched credentials instead of stored credentials
      const { host, port, username, password } = credentials;

      if (!host || !port || !username || !password) {
        throw new Error("❌ Invalid database credentials.");
      }

      // ✅ Establish direct connection
      await this.createDatabaseConnection(host, port, username, password);

      activeConnections.set(this.userId, this);
      logger.info(`✅ User ${this.userId} connected to ${this.dbType}.`);

      // ✅ Fetch and refresh schema
      logger.info(`🔄 Fetching schema for User ${this.userId} (${this.dbType})...`);
      await fetchDatabaseSchema(this.userId, this.dbType);
      logger.info(`✅ Schema fetched successfully for User ${this.userId} (${this.dbType})`);
    } catch (error) {
      const err = error as Error;
      logger.error(`❌ Failed to connect user ${this.userId} to ${this.dbType}: ${err.message}`);
      throw error;
    }
  }

  /**
   * ✅ Creates a direct database connection.
   */
  private async createDatabaseConnection(host: string, port: number, username: string, password: string): Promise<void> {
    logger.info(`🔗 Connecting to database ${this.dbType} at ${host}:${port} as ${username}`);
    // ✅ Add actual database connection logic here
  }

  /**
   * ✅ Disconnects the user from the database.
   */
  public async disconnect(): Promise<void> {
    if (!ConnectionManager.isConnected(this.userId, this.dbType)) {
      logger.warn(`⚠️ No active connection found for user ${this.userId}.`);
      return;
    }

    try {
      activeConnections.delete(this.userId);
      logger.info(`✅ User ${this.userId} disconnected from ${this.dbType}.`);
    } catch (error) {
      const err = error as Error;
      logger.error(`❌ Failed to disconnect user ${this.userId}: ${err.message}`);
      throw error;
    }
  }

  /**
   * ✅ Disconnects all active database connections (used for graceful shutdown).
   */
  public static async closeAllConnections(): Promise<void> {
    logger.info("⚠️ Closing all active database connections...");
    for (const [userId, manager] of activeConnections.entries()) {
      try {
        await manager.disconnect();
        logger.info(`✅ Successfully closed connection for User ${userId}`);
      } catch (error) {
        logger.error(`❌ Failed to close connection for User ${userId}:`, error);
      }
    }
    activeConnections.clear();
    logger.info("✅ All database connections have been closed.");
  }

  /**
   * ✅ List active database connections.
   */
  public static listActiveConnections(): any[] {
    return Array.from(activeConnections.entries()).map(([userId, data]) => ({
      userId,
      dbType: data.dbType,
      status: "Active",
    }));
  }
}
