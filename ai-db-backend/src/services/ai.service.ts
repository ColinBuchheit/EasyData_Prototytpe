import axios from "axios";
import logger from "../config/logger";
import { ENV } from "../config/env";

const MAX_RETRIES = 3;
const BACKOFF_DELAY = 2000; // 2 seconds

// ✅ Simple in-memory cache for schema responses
const schemaCache = new Map<string, any>();

/**
 * Makes a request to the AI-Agent Network with retries.
 */
async function requestAI(endpoint: string, payload: any): Promise<any> {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const response = await axios.post(
        `${ENV.AI_AGENT_API}/${endpoint}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "api_key": ENV.AI_API_KEY,
            "request_secret": ENV.BACKEND_SECRET,
          },
        }
      );

      if (response.data) {
        logger.info(`✅ AI-Agent Response from ${endpoint}:`, response.data);
        return response.data;
      } else {
        throw new Error("Invalid AI-Agent response.");
      }
    } catch (error) {
      attempt++;
      if (attempt >= MAX_RETRIES) {
        logger.error(`❌ AI-Agent call failed after ${MAX_RETRIES} attempts.`);
        throw error;
      }
      logger.warn(`⚠️ AI-Agent call to ${endpoint} failed (Attempt ${attempt}). Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_DELAY * attempt));
    }
  }
}

/**
 * Requests a database session from AI-Agent.
 */
export async function requestDatabaseSession(
  userId: number,
  dbType: string,
  authMethod: string,
  host?: string,
  port?: number,
  username?: string,
  password?: string
): Promise<any> {
  const payload: any = { userId, dbType, authMethod };

  if (authMethod === "stored" && host && port && username && password) {
    payload.host = host;
    payload.port = port;
    payload.username = username;
    payload.password = password;
  }

  return await requestAI("request-session", payload);
}

/**
 * Retrieves the database schema using an AI-Agent session.
 * Implements schema caching to reduce redundant requests.
 */
export async function fetchDatabaseSchema(sessionToken: string): Promise<any> {
  if (schemaCache.has(sessionToken)) {
    logger.info("⚡ Returning cached schema result.");
    return schemaCache.get(sessionToken);
  }

  const schema = await requestAI("fetch-schema", { sessionToken });
  schemaCache.set(sessionToken, schema); // ✅ Cache schema result
  return schema;
}

/**
 * Validates if an AI-Agent session is still active.
 */
export async function validateAISession(sessionToken: string): Promise<boolean> {
  try {
    const response = await requestAI("validate-session", { sessionToken });
    return response.isValid;
  } catch (error) {
    logger.warn("⚠️ AI-Agent session validation failed.");
    return false;
  }
}

/**
 * Lists all active AI-Agent sessions.
 */
export async function listActiveAISessions(): Promise<any[]> {
  return await requestAI("list-sessions", {});
}

/**
 * Checks if the AI-Agent API is responsive.
 */
export async function checkAIServiceHealth(): Promise<any> {
  return await requestAI("check-health", {});
}

/**
 * Executes a query via the AI-Agent Network.
 */
export async function executeAIQuery(userQuery: string, sessionToken: string): Promise<any> {
  return await requestAI("execute-query", { userQuery, sessionToken });
}

/**
 * Disconnects a database session via AI-Agent.
 */
export async function disconnectDatabaseSession(sessionToken: string): Promise<any> {
  return await requestAI("disconnect-database", { sessionToken });
}

/**
 * Logs AI-Agent activity for debugging and tracking.
 */
export async function logAIActivity(action: string, details?: any): Promise<void> {
  await requestAI("log-activity", { action, details });
}
