import axios from "axios";
import dotenv from "dotenv";
import logger from "../config/logger";

dotenv.config();

const AI_AGENT_API = process.env.AI_AGENT_API || "http://localhost:8001/query";
const AI_API_KEY = process.env.AI_API_KEY || "your-secure-api-key";
const BACKEND_SECRET = process.env.BACKEND_SECRET || "backend-secure-token";

/**
 * Sends a user question to the AI Agent Network and retrieves an SQL query.
 * @param {string} userQuery - The natural language question from the user.
 * @returns {Promise<string>} - The AI-generated SQL query.
 */
export async function fetchAIQuery(userQuery: string): Promise<string> {
  try {
    // ✅ Validate input before sending the request
    if (!userQuery || typeof userQuery !== "string" || userQuery.length < 3) {
      throw new Error("Invalid user query: Query must be a non-empty string with at least 3 characters.");
    }

    logger.info(`🔍 Sending AI Query: ${userQuery}`);

    const response = await axios.post(
      AI_AGENT_API,
      { user_query: userQuery },
      {
        headers: {
          "Content-Type": "application/json",
          "api_key": AI_API_KEY,
          "request_secret": BACKEND_SECRET,
        },
      }
    );

    if (response.data.sql_query) {
      logger.info(`✅ AI Query Processed Successfully: ${response.data.sql_query}`);
      return response.data.sql_query;
    } else {
      throw new Error("AI Agent did not return a valid SQL query.");
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      logger.error(`❌ AI Query API Error: ${error.response?.status} - ${error.response?.data}`);
      throw new Error(`Failed to generate SQL query: ${error.response?.data || "Unknown error"}`);
    } else if (error instanceof Error) {
      logger.error("❌ AI Query Processing Error:", error.message);
      throw new Error("Failed to generate SQL query: " + error.message);
    } else {
      throw new Error("An unknown error occurred while processing the AI query.");
    }
  }
}
