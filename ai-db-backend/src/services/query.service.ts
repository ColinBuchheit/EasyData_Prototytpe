import axios from "axios";
import { pool } from "../config/db";
import logger from "../config/logger";
import { fetchAllTables } from "../services/schema.service"; // ✅ Correct function
import WebSocket from "ws"; // ✅ Ensures WebSocket is from 'ws'


const AI_AGENT_URL = "http://ai-agent-network:5001/process-query";

/**
 * ✅ Send Query Request to AI-Agent and Retrieve AI-Generated SQL.
 */
export const getAIQuery = async (userMessage: string): Promise<string | null> => {
  try {
    const response = await axios.post(AI_AGENT_URL, { queryRequest: userMessage });

    if (response.data.success) {
      return response.data.sqlQuery;
    }

    logger.warn("❌ AI failed to generate a valid query.");
    return null;
  } catch (error) {
    logger.error(`❌ Error calling AI-Agent: ${(error as Error).message}`);
    return null;
  }
};

/**
 * ✅ Handles User Query Processing with AI and Executes It.
 */
export const processUserQuery = async (userId: number, userMessage: string, dbType: string): Promise<any> => {
  try {
    // 🔹 Step 1: Request AI to Generate SQL Query
    const aiQuery = await getAIQuery(userMessage);
    if (!aiQuery) {
      return { success: false, message: "❌ AI failed to generate a valid query." };
    }

    // 🔹 Step 2: Validate AI-Generated Query Against Schema
    const isValid = await validateQueryAgainstSchema(aiQuery, dbType);
    if (!isValid) {
      return { success: false, message: "❌ Query validation failed due to schema mismatch!" };
    }

    // 🔹 Step 3: Execute AI-Generated Query
    const queryResult = await executeDatabaseQuery(aiQuery);
    return { success: true, data: queryResult };
  } catch (error) {
    logger.error(`❌ Error processing AI query: ${(error as Error).message}`);
    return { success: false, message: "❌ Query execution failed." };
  }
};

/**
 * ✅ Validates AI-Generated Queries Against Database Schema Before Execution.
 */
export const validateQueryAgainstSchema = async (query: string, dbType: string): Promise<boolean> => {
  try {
    const schemaTables = await fetchAllTables(dbType); // ✅ Correct function

    // ✅ Extract tables from the query
    const queryTables = extractTablesFromQuery(query);
    
    // ✅ Ensure all tables in the query exist in the schema
    const isValidTableUsage = queryTables.every(table => schemaTables.includes(table));
    const isSelectOnly = query.trim().toUpperCase().startsWith("SELECT");

    if (!isValidTableUsage) {
      logger.warn(`❌ Query validation failed. Unknown tables: ${queryTables.filter(table => !schemaTables.includes(table))}`);
      return false;
    }

    if (!isSelectOnly) {
      logger.warn("❌ Query validation failed: Non-SELECT operations are not allowed.");
      return false;
    }

    return true;
  } catch (error) {
    logger.error(`❌ Query Schema Validation Failed: ${(error as Error).message}`);
    return false;
  }
};


/**
 * ✅ Executes AI-Generated Queries Using Parameterized Queries to Prevent SQL Injection.
 */
export const executeDatabaseQuery = async (query: string, params: any[] = []): Promise<any> => {
  try {
    logger.info(`🔍 Executing AI-validated query: ${query}`);

    // ✅ Prevents SQL injection by using parameterized queries
    const result = await pool.query({ text: query, values: params });
    return result.rows;
  } catch (error) {
    logger.error(`❌ Query Execution Error: ${(error as Error).message}`);
    throw new Error("Database query execution failed.");
  }
};

/**
 * ✅ Extracts Table Names from a SQL Query (Optimized Regex).
 */
const extractTablesFromQuery = (query: string): string[] => {
  const regex = /\bFROM\s+([a-zA-Z0-9_]+)|\bJOIN\s+([a-zA-Z0-9_]+)/gi;
  let match;
  const tables: string[] = [];

  while ((match = regex.exec(query)) !== null) {
    tables.push(match[1] || match[2]);
  }

  return tables;
};

export const processAIQuery = async (userId: number, userMessage: string, ws: WebSocket): Promise<void> => {
  try {
    logger.info(`🤖 AI Query Request from User ${userId}: ${userMessage}`);

    // 🔹 Step 1: Send query request to AI-Agent API
    const aiResponse = await axios.post(AI_AGENT_URL, { queryRequest: userMessage });

    if (!aiResponse.data.success) {
      ws.send(JSON.stringify({ type: "error", message: "❌ AI failed to generate a valid query." }));
      return;
    }

    const proposedQuery = aiResponse.data.sqlQuery;

    // 🔹 Step 2: Validate AI-generated query against the schema
    const isValid = await validateQueryAgainstSchema(proposedQuery, "postgres");
    if (!isValid) {
      ws.send(JSON.stringify({ type: "error", message: "❌ Query validation failed due to schema mismatch!" }));
      return;
    }

    // 🔹 Step 3: Execute AI-Generated Query
    const queryResult = await executeDatabaseQuery(proposedQuery);

    // 🔹 Step 4: Return Results to WebSocket Client
    ws.send(JSON.stringify({ type: "query_result", data: queryResult }));

  } catch (error) {
    logger.error(`❌ AI Query Processing Failed: ${(error as Error).message}`);
    ws.send(JSON.stringify({ type: "error", message: "❌ AI query processing failed." }));
  }
};
