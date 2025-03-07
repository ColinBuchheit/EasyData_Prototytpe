// src/routes/query.routes.ts
import { Router, Response } from "express";
import { generateSQLQuery, generateNoSQLQuery, fetchDatabaseSchema } from "../services/ai.service"; 
import { verifyToken, AuthRequest } from "../middleware/auth"; 
import { ConnectionManager } from "../services/connectionmanager"; 
import { pool } from "../config/db";
import rateLimit from "express-rate-limit";
import logger from "../config/logger";

const router = Router();

// ✅ Rate limiter to prevent API abuse (max 10 queries per minute)
const queryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: { error: "Too many queries, please try again later." }
});

/**
 * @swagger
 * /api/query:
 *   post:
 *     summary: Process a query via AI and execute it in the backend
 *     tags: [AI Queries]
 */
router.post("/query", verifyToken, queryLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { user_query, db_type } = req.body;
    const userId = req.user.id;

    const validDbTypes = ["postgres", "mysql", "mssql", "sqlite", "mongo", "firebase", "couchdb", "dynamodb"];
    if (!db_type || !validDbTypes.includes(db_type)) {
      res.status(400).json({ error: "❌ Invalid or missing database type." });
      return;
    }

    if (!user_query || typeof user_query !== "string") {
      res.status(400).json({ error: "❌ Missing or invalid query input." });
      return;
    }

    // ✅ Ensure user is connected
    if (!ConnectionManager.isConnected(userId, db_type)) {
      res.status(403).json({ error: "❌ No active database connection found. Please connect first." });
      return;
    }

    // ✅ Fetch Schema from AI service
    logger.info(`🔍 Fetching schema for user ${userId}, database type: ${db_type}`);
    const schema = await fetchDatabaseSchema(userId, db_type);

    if (!schema || schema.length === 0) {
      res.status(500).json({ error: "❌ Failed to retrieve database schema." });
      return;
    }

    logger.info(`✅ Schema retrieved for user ${userId}`);

    // ✅ Generate Query
    let aiQuery;
    if (["mongo", "firebase", "couchdb", "dynamodb"].includes(db_type)) {
      aiQuery = await generateNoSQLQuery(user_query, db_type, schema);
    } else {
      aiQuery = await generateSQLQuery(user_query, db_type, schema);
    }

    if (!aiQuery || typeof aiQuery !== "string") {
      res.status(500).json({ error: "❌ AI service returned an invalid response." });
      return;
    }

    // ✅ Security Check: Only allow SELECT queries for SQL databases
    if (["postgres", "mysql", "mssql", "sqlite"].includes(db_type) && !aiQuery.trim().toUpperCase().startsWith("SELECT")) {
      res.status(403).json({ error: "❌ Only SELECT queries are allowed." });
      return;
    }

    logger.info(`✅ AI-Generated Query for user ${userId}: ${aiQuery}`);

    // ✅ Execute Query
    let result;
    if (["mongo", "firebase", "couchdb", "dynamodb"].includes(db_type)) {
      result = await ConnectionManager.executeNoSQLQuery(userId, db_type, aiQuery);
    } else {
      result = await pool.query(aiQuery);
    }

    logger.info(`✅ Executed query for user ${userId}: ${aiQuery}`);

    res.json({ success: true, data: result.rows || result });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Query Execution Failed: ${err.message}`);
    res.status(500).json({ error: "Failed to execute query.", details: err.message });
  }
});

export default router;
