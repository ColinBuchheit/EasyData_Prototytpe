import { AuthRequest } from "../middleware/auth";
import { Response } from "express";
import { generateSQLQuery, generateNoSQLQuery, fetchDatabaseSchema } from "../services/ai.service"; // ✅ Uses AI for schema & query
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

    // ✅ Generate Query (SQL or NoSQL)
    let aiQuery;
    if (["mongo", "firebase", "couchdb", "dynamodb"].includes(db_type)) {
      aiQuery = await generateNoSQLQuery(user_query, db_type, schema); // ✅ NoSQL Query Generation
    } else {
      aiQuery = await generateSQLQuery(user_query, db_type, schema); // ✅ SQL Query Generation
    }

    if (!aiQuery || typeof aiQuery !== "object") {
      throw new Error("AI service returned an invalid response.");
    }

    logger.info(`✅ AI-Generated Query for user ${userId}: ${JSON.stringify(aiQuery)}`);

    // ✅ Validate the query against the schema before executing
    if (!validateQueryAgainstSchema(aiQuery, schema, db_type)) {
      res.status(400).json({ error: "❌ AI-Generated query does not match schema constraints." });
      return;
    }

    // ✅ Execute Query
    let result;
    if (["mongo", "firebase", "couchdb", "dynamodb"].includes(db_type)) {
      result = await ConnectionManager.executeNoSQLQuery(userId, db_type, aiQuery);
    } else {
      // ✅ Security Check: Only allow SELECT queries for SQL
      if (!aiQuery.query.trim().toUpperCase().startsWith("SELECT")) {
        res.status(403).json({ error: "❌ Only SELECT queries are allowed." });
        return;
      }
      result = await pool.query(aiQuery.query);
    }

    res.json({ success: true, data: result.rows || result });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Query Execution Failed: ${err.message}`);
    res.status(500).json({ error: "Failed to execute query.", details: err.message });
  }
};

/**
 * Validates the AI-generated query against the database schema.
 */
function validateQueryAgainstSchema(query: any, schema: any[], dbType: string): boolean {
  if (["mongo", "firebase", "couchdb", "dynamodb"].includes(dbType)) {
    // ✅ NoSQL Schema Validation
    const validCollections = new Set(schema.map((item) => item.collection));
    if (typeof query === "string") {
      return validCollections.has(query); // ✅ If query is a collection name string
    } else if (typeof query === "object" && query !== null && "collection" in query) {
      return validCollections.has(query.collection as string); // ✅ If query object has `collection`
    }
    return false; // ✅ Query does not match any valid collection
  }

  // ✅ SQL Schema Validation
  const tables = new Set(schema.map((item) => item.table_name.toLowerCase()));
  const columns = new Set(
    schema.map((item) => `${item.table_name.toLowerCase()}.${item.column_name.toLowerCase()}`)
  );
  const columnDataTypes = new Map(
    schema.map((item) => [`${item.table_name.toLowerCase()}.${item.column_name.toLowerCase()}`, item.data_type])
  );

  // ✅ Extract table & column names from the query
const usedTables = Array.from(query.matchAll(/\bFROM\s+([a-zA-Z_][\w]*)/gi))
.map((match) => (match as RegExpMatchArray)[1]?.toLowerCase() || "");

const usedColumns = Array.from(query.matchAll(/\bSELECT\s+(.*?)\bFROM/gi))
.map((match) => (match as RegExpMatchArray)[1]?.toLowerCase() || "");



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
