import logger from "../config/logger";
import { fetchDatabaseSchema } from "../services/ai.service";
import crypto from "crypto";
import { ENV } from "../config/env";

// ✅ Active connections storage
const activeConnections: Map<number, ConnectionManager> = new Map();

export class ConnectionManager {
  private userId: number;
  private dbType: string;
  private encryptedCredentials: string;

  // ✅ Added NoSQL Database Clients to Prevent Errors
  private mongoClient: any;
  private firebaseClient: any;
  private couchClient: any;
  private dynamoClient: any;

  constructor(userId: number, dbType: string, credentials: any) {
    this.userId = userId;
    this.dbType = dbType;
    this.encryptedCredentials = this.encryptData(credentials);

    // ✅ Initialize NoSQL Clients to Prevent Undefined Errors
    if (dbType === "mongo") {
      this.mongoClient = require("mongodb").MongoClient;
    } else if (dbType === "firebase") {
      this.firebaseClient = require("firebase-admin");
    } else if (dbType === "couchdb") {
      this.couchClient = require("nano")("http://localhost:5984");
    } else if (dbType === "dynamodb") {
      this.dynamoClient = require("aws-sdk").DynamoDB.DocumentClient;
    }
  }



  private encryptData(data: any): string {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(ENV.ENCRYPTION_KEY, "salt", 32); // Derive a 32-byte key
    const iv = crypto.randomBytes(16); // Generate a 16-byte IV (Initialization Vector)

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
    encrypted += cipher.final("hex");

    // Store IV along with encrypted data for later decryption
    return iv.toString("hex") + ":" + encrypted;
}

private decryptData(): any {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(ENV.ENCRYPTION_KEY, "salt", 32);

    // Extract IV from encrypted data
    const encryptedParts = this.encryptedCredentials.split(":");
    const iv = Buffer.from(encryptedParts[0], "hex");
    const encryptedText = encryptedParts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
}


  public static isConnected(userId: number, dbType: string, dbName?: string): boolean {
    const connection = activeConnections.get(userId);
    if (!connection || connection.dbType !== dbType) return false;

    if (["mongo", "firebase", "couchdb", "dynamodb"].includes(dbType)) {
      return dbName ? connection.decryptData()?.dbName === dbName : true;
    }

    return true;
  }

  public static async getMongoSchema(userId: number): Promise<any> {
    logger.info(`📊 Fetching MongoDB schema for User ${userId}...`);
    // TODO: Implement real MongoDB schema extraction logic
    return [{ collection: "users", fields: ["_id", "name", "email"] }];
  }

  public static async getFirebaseSchema(userId: number): Promise<any> {
    logger.info(`📊 Fetching Firebase schema for User ${userId}...`);
    // TODO: Implement real Firebase Firestore schema extraction logic
    return [{ collection: "users", fields: ["id", "email", "createdAt"] }];
  }

  public static async getCouchDBSchema(userId: number): Promise<any> {
    logger.info(`📊 Fetching CouchDB schema for User ${userId}...`);
    // TODO: Implement real CouchDB schema extraction logic
    return [{ database: "users", fields: ["_id", "name", "email"] }];
  }

  public static async getDynamoDBSchema(userId: number): Promise<any> {
    logger.info(`📊 Fetching DynamoDB schema for User ${userId}...`);
    // TODO: Implement real DynamoDB schema extraction logic
    return [{ table: "users", attributes: ["id", "name", "email"] }];
  }

  public static async checkRoleAccess(userId: number, dbType: string, requiredRoles: string[]): Promise<boolean> {
    const connection = activeConnections.get(userId);
    if (!connection || connection.dbType !== dbType) return false;

    const userRole = "user"; // TODO: Fetch from DB
    return requiredRoles.includes(userRole);
  }

  public static async checkOwnership(userId: number, dbId: string, dbType: string): Promise<boolean> {
    const connection = activeConnections.get(userId);
    if (!connection || connection.dbType !== dbType) return false;

    const ownedDatabases = ["1234", "5678"]; // TODO: Fetch from DB
    return ownedDatabases.includes(dbId);
  }

  public async connect(credentials: any): Promise<void> {
    if (ConnectionManager.isConnected(this.userId, this.dbType)) {
      logger.info(`⚡ User ${this.userId} is already connected to ${this.dbType}.`);
      return;
    }

    try {
      await this.createDatabaseConnection(credentials);
      activeConnections.set(this.userId, this);
      logger.info(`✅ User ${this.userId} connected to ${this.dbType}.`);

      await fetchDatabaseSchema(this.userId, this.dbType);
    } catch (error) {
      logger.error(`❌ Failed to connect user ${this.userId}: ${(error as Error).message}`);
      throw error;
    }
  }

  private async createDatabaseConnection(credentials: any): Promise<void> {
    logger.info(`🔗 Connecting to ${this.dbType} with encrypted credentials`);
  }

  public async disconnect(): Promise<void> {
    if (!ConnectionManager.isConnected(this.userId, this.dbType)) {
      logger.warn(`⚠️ No active connection found for user ${this.userId}.`);
      return;
    }

    try {
      activeConnections.delete(this.userId);
      logger.info(`✅ User ${this.userId} disconnected from ${this.dbType}.`);
    } catch (error) {
      logger.error(`❌ Failed to disconnect user ${this.userId}: ${(error as Error).message}`);
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
        logger.error(`❌ Failed to close connection for User ${userId}: ${(error as Error).message}`);
      }
    }
    activeConnections.clear();
    logger.info("✅ All database connections have been closed.");
  }

  /**
 * ✅ Retrieves an existing connection or creates a new one.
 */
public static getInstance(userId: number, dbType: string): ConnectionManager {
  if (!activeConnections.has(userId)) {
      throw new Error(`❌ No active connection found for User ${userId} (${dbType}).`);
  }
  return activeConnections.get(userId)!;
}


  public static async executeNoSQLQuery(userId: number, dbType: string, query: any): Promise<any> {
    try {
      const connection = activeConnections.get(userId);
      if (!connection || connection.dbType !== dbType) {
        throw new Error(`❌ No active connection for ${dbType}`);
      }
  
      logger.info(`🔍 Executing NoSQL query for User ${userId} on ${dbType}`);
  
      switch (dbType) {
        case "mongo":
          return await connection.mongoClient.db().collection(query.collection).find(query.filter || {}).toArray();
        case "firebase":
          return await connection.firebaseClient.firestore().collection(query.collection).get();
        case "couchdb":
          return await connection.couchClient.db(query.database).view(query.view, query.params || {});
        case "dynamodb":
          return await connection.dynamoClient.scan(query.params).promise();
        default:
          throw new Error(`❌ Unsupported NoSQL database: ${dbType}`);
      }
    } catch (error) {
      logger.error(`❌ NoSQL Query Execution Failed: ${(error as Error).message}`);
      throw error;
    }
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
