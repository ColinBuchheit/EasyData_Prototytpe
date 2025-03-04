// src/routes/query.routes.ts
import { Router, Response } from "express";
import { generateSQLQuery, fetchDatabaseSchema } from "../services/ai.service"; 
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

    const validDbTypes = ["postgres", "mysql", "mssql", "sqlite"];
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

    // ✅ Get connection manager instance with `dbType`
    const connectionManager = ConnectionManager.getInstance(userId, db_type);

    // ✅ Fetch Schema from AI service
    logger.info(`🔍 Fetching schema for user ${userId}, database type: ${db_type}`);
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

    // ✅ Execute Query
    const result = await pool.query(sqlQuery);

    res.json({ success: true, data: result.rows });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`❌ Query Execution Failed: ${err.message}`);
    res.status(500).json({ error: "Failed to execute query.", details: err.message });
  }
});

export default router;
