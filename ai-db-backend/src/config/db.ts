// src/config/db.ts
import { Pool } from "pg";
import { ENV } from "./env";
import logger from "./logger";
import { createContextLogger } from "./logger";
import { MongoClient } from "mongodb";
import { connectWithRetry } from "../shared/utils/connectionHelpers";

const dbLogger = createContextLogger("Database");
const MAX_CONNECTIONS = Number(process.env.DB_MAX_CONNECTIONS) || 10;

// ========================
// ✅ POSTGRES CONFIG
// ========================
const pool = new Pool({
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  user: ENV.DB_USER,
  password: ENV.DB_PASSWORD,
  database: ENV.DB_DATABASE,
  max: MAX_CONNECTIONS,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize Postgres connection with retry
const initializePostgres = async () => {
  await connectWithRetry(
    async () => {
      const client = await pool.connect();
      try {
        await client.query("SELECT 1");
        dbLogger.info("PostgreSQL connected successfully");
      } finally {
        client.release();
      }
    },
    "PostgreSQL",
    { attempts: 5, initialDelay: 2000 }
  );
};

initializePostgres().catch(err => {
  dbLogger.error(`Failed to initialize PostgreSQL: ${err.message}`);
});

const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 500) {
    dbLogger.warn(`Slow Query: ${text} (${duration}ms)`);
  }
  return result;
};

const checkDatabaseHealth = async () => {
  setInterval(async () => {
    try {
      const client = await pool.connect();
      try {
        await client.query("SELECT 1");
        dbLogger.info("PostgreSQL is healthy");
      } finally {
        client.release();
      }
    } catch (err) {
      dbLogger.error(`PostgreSQL health check failed: ${(err as Error).message}`);
      await initializePostgres();
    }
  }, 60000);
};

checkDatabaseHealth();

const closeDatabase = async () => {
  dbLogger.info("Closing PostgreSQL connection...");
  await pool.end();
  dbLogger.info("PostgreSQL connection closed");
};

// ========================
// ✅ MONGODB CONFIG
// ========================
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ai_conversations";
let mongoClient: MongoClient | null = null;

const getMongoClient = async (): Promise<MongoClient> => {
  if (mongoClient) {
    return mongoClient;
  }
  
  mongoClient = await connectWithRetry(
    async () => {
      const client = new MongoClient(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      } as any);
      
      await client.connect();
      dbLogger.info("MongoDB connected successfully");
      return client;
    },
    "MongoDB",
    { attempts: 5, initialDelay: 2000 }
  );
  
  return mongoClient;
};

const closeMongo = async () => {
  if (mongoClient) {
    dbLogger.info("Closing MongoDB connection...");
    await mongoClient.close();
    mongoClient = null;
    dbLogger.info("MongoDB connection closed");
  }
};

// Export methods and clients
export { 
  pool, 
  getMongoClient, 
  query, 
  closeDatabase, 
  closeMongo 
};