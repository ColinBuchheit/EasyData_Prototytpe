import { Request, Response } from "express";
import { ConnectionManager } from "../services/connectionmanager";
import { AuthRequest } from "../middleware/auth";
import { pool } from "../config/db";
import logger from "../config/logger";
import { fetchCloudCredentials } from "../services/cloudAuth.service";

/**
 * Connects the user to a database securely.
 */
export const connectDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let { dbType, cloudProvider, credentials } = req.body;
    const userId = req.user.id;

    if (!credentials || typeof credentials !== "object") {
      res.status(400).json({ message: "❌ Invalid or missing database credentials." });
      return;
    }

    // ✅ Validate dbType before proceeding
    if (dbType && !["mongo", "firebase", "couchdb", "dynamodb", "sql"].includes(dbType)) {
      res.status(400).json({ message: "❌ Invalid database type." });
      return;
    }

    // ✅ Auto-detect database type if not provided
    if (!dbType) {
      logger.info("🔍 Auto-detecting database type...");
      dbType = await detectDatabaseType(credentials);
      if (!dbType) {
        res.status(400).json({ message: "❌ Unable to detect database type. Please specify manually." });
        return;
      }
      logger.info(`✅ Detected database type: ${dbType}`);
    }

    const finalCredentials = credentials || await fetchCloudCredentials(userId, dbType);
    if (!finalCredentials) {
      res.status(401).json({ message: "❌ Unauthorized: No credentials found." });
      return;
    }

    const isAlreadyConnected = ConnectionManager.isConnected(userId, dbType);
    if (isAlreadyConnected) {
      res.status(400).json({ message: "❌ You are already connected to a database." });
      return;
    }

    const connectionManager = new ConnectionManager(userId, dbType, finalCredentials);
    await connectionManager.connect(finalCredentials);

    logger.info(`✅ User ${userId} connected to ${dbType}`);
    res.json({ message: `✅ Successfully connected to ${dbType}` });
  } catch (error) {
    logger.error(`❌ Database connection failed: ${(error as Error).message}`);
    res.status(500).json({ message: "Database connection failed" });
  }
};


/**
 * Retrieves the database schema.
 */
/**
 * Retrieves the database schema.
 */
export const getDatabaseSchema = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dbType } = req.body;
    const userId = req.user.id;

    if (!dbType) {
      res.status(400).json({ message: "❌ Missing database type." });
      return;
    }

    if (!ConnectionManager.isConnected(userId, dbType)) {
      res.status(400).json({ message: "❌ No active database connection." });
      return;
    }

    logger.info(`📊 Fetching database schema for User ${userId}, DB: ${dbType}`);

    let schema;
    
    switch (dbType) {
      case "mongo":
        schema = await ConnectionManager.getMongoSchema(userId);
        break;
      case "firebase":
        schema = await ConnectionManager.getFirebaseSchema(userId);
        break;
      case "couchdb":
        schema = await ConnectionManager.getCouchDBSchema(userId);
        break;
      case "dynamodb":
        schema = await ConnectionManager.getDynamoDBSchema(userId);
        break;
      default:
        // ✅ SQL schema retrieval via information_schema
        const schemaQuery = `
          SELECT table_name, column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = $1
        `;
        const { rows } = await pool.query(schemaQuery, ["public"]);
        schema = rows.map(row => ({
          table: row.table_name,
          column: row.column_name,
          type: row.data_type
        }));
        break;
    }

    res.json({ schema });
  } catch (error) {
    logger.error(`❌ Failed to retrieve schema: ${(error as Error).message}`);
    res.status(500).json({ message: "Failed to retrieve schema" });
  }
};


/**
 * Disconnects the user from the database.
 */
export const disconnectDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const activeConnections = ConnectionManager.listActiveConnections();
    const activeConnection = activeConnections.find(conn => conn.userId === userId);

    if (!activeConnection) {
      res.status(400).json({ message: "❌ No active database connection to disconnect." });
      return;
    }

    const { dbType } = activeConnection;
    const connectionManager = new ConnectionManager(userId, dbType, {});
    await connectionManager.disconnect();

    logger.info(`✅ User ${userId} disconnected from ${dbType}.`);
    res.json({ message: "✅ Database session closed." });
  } catch (error) {
    logger.error(`❌ Database session disconnection failed: ${(error as Error).message}`);
    res.status(500).json({ message: "Database session disconnection failed" });
  }
};

/**
 * Detects database type based on provided credentials or API connection.
 */
const detectDatabaseType = async (credentials: any): Promise<string | null> => {
  try {
    if (!credentials || typeof credentials !== "object") {
      return null;
    }

    const { url, host, username } = credentials;
    if (!url && !host) {
      return null;
    }

    if (url?.includes("mongodb.net")) return "mongo";
    if (url?.includes("firebaseio.com") || url?.includes("firestore.googleapis.com")) return "firebase";
    if (url?.includes("couchdb") || url?.includes("_all_dbs")) return "couchdb";
    if (url?.includes("dynamodb") || credentials?.aws_access_key_id) return "dynamodb";
    const sqlHosts = ["postgresql", "mysql", "mariadb", "sqlserver"];
    if (host && sqlHosts.some(db => host.includes(db))) return "sql";

    return null;
  } catch (error) {
    logger.error(`❌ Error detecting database type: ${(error as Error).message}`);
    return null;
  }
};

