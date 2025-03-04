import axios from "axios";
import logger from "../config/logger";
import { ENV } from "../config/env";
import { pool } from "../config/db";
import redisClient from "../config/redis"; // ✅ Import Redis Client

const MAX_RETRIES = 3;
const BACKOFF_DELAY = 2000; // 2 seconds
const schemaCache = new Map<string, { schema: any; timeout: NodeJS.Timeout }>();

/**
 * ✅ Listens for database schema changes.
 */
export async function listenForSchemaChanges() {
  const client = await pool.connect();
  client.query("LISTEN schema_changes"); // ✅ PostgreSQL `pg_notify` listener

  client.on("notification", async (msg) => {
    logger.info(`🔄 Schema change detected: ${msg.payload}`);

    // ✅ Ensure `msg.payload` is a valid JSON string before parsing
    if (!msg.payload) {
      logger.warn("⚠️ Received empty schema change notification.");
      return;
    }

    try {
      const { userId, dbType } = JSON.parse(msg.payload);

      // ✅ Refresh schema cache dynamically
      await fetchDatabaseSchema(userId, dbType, true); // Force refresh

      logger.info(`✅ Schema refreshed for User ${userId} (${dbType})`);
    } catch (error) {
      logger.error("❌ Failed to parse schema change notification:", error);
    }
  });

  logger.info("✅ Listening for schema changes...");
}

/**
 * ✅ Fetches & caches database schema, refreshing only if needed.
 */
export async function fetchDatabaseSchema(userId: number, dbType: string, forceRefresh = false): Promise<any> {
  const cacheKey = `schema:${userId}:${dbType}`;
  if (!forceRefresh) {
    const cachedSchema = await redisClient.get(cacheKey);
    if (cachedSchema) {
      logger.info("⚡ Using cached schema.");
      return JSON.parse(cachedSchema);
    }
  }

  logger.info("🔄 Fetching schema from database...");
  const schemaQuery = `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public';`;
  const { rows } = await pool.query(schemaQuery);

  await redisClient.set(cacheKey, JSON.stringify(rows), { EX: 3600 });
  return rows;
}

/**
 * ✅ Generates an AI-powered SQL query with schema validation.
 */
export async function generateSQLQuery(userQuery: string, dbType: string, schema: any): Promise<string> {
  try {
    logger.info(`🔍 Sending query generation request to AI-Agent Network for DB: ${dbType}`);
    const response = await axios.post(
      `${ENV.AI_AGENT_API}/generate-sql-query`,
      { userQuery, dbType, schema },
      {
        headers: {
          "Content-Type": "application/json",
          "api_key": ENV.AI_API_KEY,
          "request_secret": ENV.BACKEND_SECRET,
          "origin": "backend-service"
        },
      }
    );

    if (!response.data || !response.data.sqlQuery) {
      throw new Error("AI failed to generate a valid SQL query.");
    }

    logger.info(`✅ AI-Generated SQL Query: ${response.data.sqlQuery}`);
    return response.data.sqlQuery;
  } catch (error) {
    const err = error as Error;
    logger.error(`❌ AI failed to generate SQL query: ${err.message}`);
    throw new Error("AI-Agent Network failed to generate a valid SQL query.");
  }
}

/**
 * ✅ Notifies the AI-Agent Network of an updated schema.
 */
export async function getSchemaForAI(userId: number, dbType: string): Promise<any> {
  const schema = await fetchDatabaseSchema(userId, dbType);

  try {
    await axios.post(`${ENV.AI_AGENT_API}/update-schema`, {
      userId,
      dbType,
      schema
    }, {
      headers: {
        "Content-Type": "application/json",
        "api_key": ENV.AI_API_KEY,
        "request_secret": ENV.BACKEND_SECRET,
      }
    });
    logger.info(`✅ Sent updated schema to AI-Agent Network for User ${userId} (${dbType})`);
  } catch (error) {
    logger.error("❌ Failed to update AI-Agent Network with schema:", error);
  }

  return { schema };
}

/**
 * ✅ Refreshes schema when a user connects to a new database session.
 */
export async function refreshSchemaOnConnect(userId: number, dbType: string): Promise<void> {
  try {
    logger.info(`🔄 Refreshing schema for User ${userId} (${dbType})`);
    await fetchDatabaseSchema(userId, dbType);
    logger.info(`✅ Schema refreshed for User ${userId} (${dbType})`);
  } catch (error) {
    logger.error("❌ Failed to refresh schema on connect:", error);
  }
}

/**
 * ✅ Checks if the AI-Agent Network is responsive.
 */
export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${ENV.AI_AGENT_API}/health`);
    return response.status === 200;
  } catch (error) {
    logger.warn("⚠️ AI-Agent Network is unresponsive.");
    return false;
  }
}

/**
 * ✅ Lists all active AI-Agent sessions.
 */
export async function listActiveAISessions(): Promise<any[]> {
  try {
    const response = await axios.get(`${ENV.AI_AGENT_API}/active-sessions`);
    return response.data.sessions;
  } catch (error) {
    logger.error("❌ Failed to retrieve AI-Agent sessions.");
    return [];
  }
}

/**
 * ✅ Logs AI-Agent activity for debugging and tracking.
 */
export async function logAIActivity(action: string, details?: any): Promise<void> {
  await axios.post(`${ENV.AI_AGENT_API}/log-activity`, {
    action,
    details
  }, {
    headers: {
      "Content-Type": "application/json",
      "api_key": ENV.AI_API_KEY,
      "request_secret": ENV.BACKEND_SECRET,
    }
  });
}
