import axios from "axios";
import logger from "../config/logger";
import { ENV } from "../config/env";
import { pool } from "../config/db";
import redisClient from "../config/redis"; // ✅ Import Redis Client
import { activeConnections } from "../server";

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

    if (!msg.payload) {
      logger.warn("⚠️ Received empty schema change notification.");
      return;
    }

    try {
      const { userId, dbType } = JSON.parse(msg.payload);
      await fetchDatabaseSchema(userId, dbType, true); // Force refresh
      logger.info(`✅ Schema refreshed for User ${userId} (${dbType})`);
    } catch (error) {
      logger.error("❌ Failed to parse schema change notification:", error);
    }
  });

  logger.info("✅ Listening for schema changes...");
}

/**
 * ✅ Invalidates cached schema for a user and database.
 */
export async function invalidateSchemaCache(userId: number, dbType: string): Promise<void> {
  try {
    const cacheKey = `schema:${userId}:${dbType}`;
    await redisClient.del(cacheKey);
    logger.info(`🗑️ Cache invalidated for schema: ${cacheKey}`);
  } catch (error) {
    logger.error(`❌ Failed to invalidate schema cache: ${error}`);
  }
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

  if (!rows || rows.length === 0) {
    throw new Error(`❌ Failed to fetch valid schema for user ${userId}, dbType: ${dbType}`);
  }

  await redisClient.set(cacheKey, JSON.stringify(rows), { EX: 3600 });
  return rows;
}

/**
 * ✅ Generates an AI-powered SQL query with schema validation.
 */
export async function generateSQLQuery(userQuery: string, dbType: string, schema: any): Promise<string> {
  let attempt = 0;
  let lastError: any = null;

  while (attempt < MAX_RETRIES) {
    try {
      logger.info(`🔍 [Attempt ${attempt + 1}] Sending query request to AI-Agent Network for DB: ${dbType}`);
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

      const sqlQuery = response.data.sqlQuery.trim();
      logger.info(`✅ AI-Generated SQL Query: ${sqlQuery}`);

      // ✅ Enforce SELECT-only queries
      if (!sqlQuery.toUpperCase().startsWith("SELECT")) {
        throw new Error("❌ AI generated a non-SELECT query, which is not allowed.");
      }

      return sqlQuery;
    } catch (error) {
      lastError = error;
      logger.error(`❌ AI failed to generate SQL query: ${error}`);
      attempt++;
    }
  }

  throw new Error(`AI-Agent Network failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

/**
 * ✅ Generates NoSQL queries with schema validation.
 */
export async function generateNoSQLQuery(userQuery: string, dbType: string, schema: any[], userId?: number): Promise<any> {
  let attempt = 0;
  let lastError: any = null;

  logger.info(`🔍 Generating NoSQL query for database type: ${dbType} (User: ${userId})`);

  if (!schema || schema.length === 0 || !schema[0].collection) {
    throw new Error("❌ Schema data is missing or invalid for NoSQL query generation.");
  }

  while (attempt < MAX_RETRIES) {
    try {
      const response = await axios.post(
        `${ENV.AI_AGENT_API}/generate-nosql-query`,
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

      if (!response.data || !response.data.nosqlQuery) {
        throw new Error("❌ AI failed to generate a valid NoSQL query.");
      }

      const nosqlQuery = response.data.nosqlQuery;
      logger.info(`✅ AI-Generated NoSQL Query: ${JSON.stringify(nosqlQuery)}`);

      // ✅ WebSocket Streaming: Send AI query response in real time
      if (userId && activeConnections.has(userId)) {
        activeConnections.get(userId)?.send(
          JSON.stringify({ type: "nosql_query_generated", data: nosqlQuery })
        );
      }

      return nosqlQuery;
    } catch (error) {
      lastError = error;
      logger.error(`❌ NoSQL query generation failed (Attempt ${attempt + 1}): ${error}`);
      attempt++;
    }
  }

  throw new Error(`AI-Agent Network failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
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
 * ✅ Lists all active AI-Agent sessions.
 */
export async function listActiveAISessions(): Promise<any[]> {
  try {
    logger.info("🔍 Fetching active AI-Agent sessions...");
    const response = await axios.get(`${ENV.AI_AGENT_API}/active-sessions`, {
      headers: {
        "Content-Type": "application/json",
        "api_key": ENV.AI_API_KEY,
        "request_secret": ENV.BACKEND_SECRET,
      },
    });

    if (!response.data || !response.data.sessions) {
      throw new Error("No active AI sessions found.");
    }

    logger.info(`✅ Retrieved ${response.data.sessions.length} active AI-Agent sessions.`);
    return response.data.sessions;
  } catch (error) {
    logger.error("❌ Failed to retrieve AI-Agent sessions:", error);
    return [];
  }
}

export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    // Example API health check
    const response = await fetch(`${process.env.AI_AGENT_API}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}


/**
 * ✅ Refreshes schema when a user connects to a new database session.
 */
export async function refreshSchemaOnConnect(userId: number, dbType: string): Promise<void> {
  try {
    logger.info(`🔄 Refreshing schema for User ${userId} (${dbType})`);
    await fetchDatabaseSchema(userId, dbType, true); // Force refresh
    logger.info(`✅ Schema refreshed for User ${userId} (${dbType})`);
  } catch (error) {
    logger.error("❌ Failed to refresh schema on connect:", error);
  }
}

/**
 * ✅ Logs AI-Agent activity for debugging and tracking.
 */
export async function logAIActivity(action: string, details?: any): Promise<void> {
  try {
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
  } catch (error) {
    logger.warn(`⚠️ Failed to log AI activity: ${action}`);
  }
}
