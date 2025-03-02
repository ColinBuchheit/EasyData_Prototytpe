import axios from "axios";
import logger from "../config/logger";
import { ENV } from "../config/env"; // ✅ Use centralized env loader

const MAX_RETRIES = 3;
const BACKOFF_DELAY = 2000; // 2 seconds

/**
 * Makes a request to the AI-Agent Network.
 * Implements retries with exponential backoff.
 * @param {string} endpoint - The AI-Agent endpoint to call.
 * @param {any} payload - The request body payload.
 * @returns {Promise<any>} - The AI response.
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
 * Requests a database session from AI-Agent using either session-based or stored credentials.
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

  // ✅ If using stored authentication, send credentials securely
  if (authMethod === "stored" && host && port && username && password) {
    payload.host = host;
    payload.port = port;
    payload.username = username;
    payload.password = password;
  }

  return await requestAI("request-session", payload);
}

/**
 * Retrieves the database schema using an active session token.
 */
export async function fetchDatabaseSchema(sessionToken: string): Promise<any> {
  return await requestAI("fetch-schema", { sessionToken });
}

/**
 * Executes a query via the AI-Agent Network using an active session.
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
