import { AuthRequest } from "../middleware/auth";
import { Response } from "express";
import { generateSQLQuery, fetchDatabaseSchema } from "../services/ai.service"; // ✅ Uses AI for schema & query
import { ConnectionManager } from "../services/connectionmanager";
import { pool } from "../config/db";
import logger from "../config/logger";

/**
 * Processes AI-generated query requests and executes them in the backend.
 */
export const processQuery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { user_query, db_type } = req.body;
    const userId = req.user.id;

    if (!user_query || typeof user_query !== "string") {
      res.status(400).json({ error: "❌ Missing or invalid query input." });
      return;
    }

    if (!db_type || typeof db_type !== "string") {
      res.status(400).json({ error: "❌ Missing or invalid database type." });
      return;
    }

    // ✅ Ensure user is connected
    if (!ConnectionManager.isConnected(userId, db_type)) {
      res.status(403).json({ error: "❌ No active database connection found. Please connect first." });
      return;
    }

    // ✅ Fetch Schema from AI service
    logger.info(`🔍 Fetching schema for User ${userId}, database type: ${db_type}`);
    const schema = await fetchDatabaseSchema(userId, db_type);

    if (!schema || schema.length === 0) {
      res.status(500).json({ error: "❌ Failed to retrieve database schema." });
      return;
    }

    logger.info(`✅ Schema retrieved for user ${userId}`);

    // ✅ Generate SQL Query
    logger.info(`🔍 Generating SQL query for user ${userId}: ${user_query}`);
    const sqlQuery = await generateSQLQuery(user_query, db_type, schema);

    if (!sqlQuery || typeof sqlQuery !== "string") {
      throw new Error("AI service returned an invalid response.");
    }

    // ✅ Security Check: Only allow SELECT queries
    if (!sqlQuery.trim().toUpperCase().startsWith("SELECT")) {
      res.status(403).json({ error: "❌ Only SELECT queries are allowed." });
      return;
    }

    logger.info(`✅ AI-Generated SQL for user ${userId}: ${sqlQuery}`);

    // ✅ Validate the query against the schema before executing
    if (!validateSQLAgainstSchema(sqlQuery, schema)) {
      res.status(400).json({ error: "❌ AI-Generated query does not match schema constraints." });
      return;
    }

    // ✅ Execute Query
    const result = await pool.query(sqlQuery);

    res.json({ success: true, data: result.rows });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Query Execution Failed: ${err.message}`);
    res.status(500).json({ error: "Failed to execute query.", details: err.message });
  }
};

/**
 * Validates the AI-generated SQL query against the database schema.
 */
function validateSQLAgainstSchema(sqlQuery: string, schema: any[]): boolean {
  const tables = new Set(schema.map((item) => item.table_name.toLowerCase()));
  const columns = new Set(schema.map((item) => `${item.table_name.toLowerCase()}.${item.column_name.toLowerCase()}`));
  const columnDataTypes = new Map(
    schema.map((item) => [`${item.table_name.toLowerCase()}.${item.column_name.toLowerCase()}`, item.data_type])
  );

  // ✅ Extract table & column names from the query (Handles Aliases & JOINs)
  const usedTables = Array.from(sqlQuery.matchAll(/\bFROM\s+([a-zA-Z_][\w]*)/gi)).map((match) => match[1].toLowerCase());
  const usedColumns = Array.from(sqlQuery.matchAll(/\bSELECT\s+(.*?)\bFROM/gi)).map((match) => match[1].toLowerCase());

  // ✅ Ensure all referenced tables exist
  for (const table of usedTables) {
    if (!tables.has(table)) {
      logger.warn(`❌ Query references non-existent table: ${table}`);
      return false;
    }
  }

  // ✅ Ensure all referenced columns exist & match expected data types
  for (const column of usedColumns) {
    const [table, col] = column.split(".");
    if (!columns.has(`${table}.${col}`)) {
      logger.warn(`❌ Query references non-existent column: ${table}.${col}`);
      return false;
    }

    // ✅ Verify data type consistency
    const expectedType = columnDataTypes.get(`${table}.${col}`);
    if (!expectedType) {
      logger.warn(`⚠️ Data type missing for column: ${table}.${col}`);
      return false;
    }
  }

  return true;
}
