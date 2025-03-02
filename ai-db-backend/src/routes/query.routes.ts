import { Router, Response } from "express";
import { executeAIQuery } from "../services/ai.service"; // ✅ AI-Agent Query Execution
import { verifyToken, AuthRequest } from "../middleware/auth"; // ✅ Correct request type
import { getSession } from "../services/dbSession.service"; // ✅ Validate sessions before executing queries
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
 * /api/ai-query:
 *   post:
 *     summary: Execute a query via AI-Agent using a session token
 *     tags: [AI Queries]
 */
router.post("/ai-query", verifyToken, queryLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { user_query, sessionToken } = req.body;

    if (!user_query || typeof user_query !== "string") {
      res.status(400).json({ error: "❌ Missing or invalid query input." });
      return;
    }

    if (!sessionToken || typeof sessionToken !== "string") {
      res.status(400).json({ error: "❌ Missing or invalid session token." });
      return;
    }

    // ✅ Validate session before executing query
    const session = await getSession(req.user.id, sessionToken);
    if (!session) {
      res.status(403).json({ error: "❌ Invalid or expired session token." });
      return;
    }

    // ✅ Enhanced input validation to prevent SQL Injection
    const sanitizedQuery = user_query.replace(/[^a-zA-Z0-9 _-]/g, "").trim();

    if (sanitizedQuery.length < 3) {
      res.status(400).json({ error: "❌ Query too short." });
      return;
    }

    logger.info(`🔍 Processing AI query request: ${sanitizedQuery}`);

    // ✅ Fetch AI-generated SQL query
    const sqlQuery = await executeAIQuery(sanitizedQuery, sessionToken);

    if (!sqlQuery || typeof sqlQuery !== "string") {
      throw new Error("AI service returned an invalid response.");
    }

    res.json({ sql_query: sqlQuery });
  } catch (error: unknown) {
    const err = error as Error; // ✅ Explicitly cast `error` to `Error`
    logger.error("❌ AI Query Processing Failed:", err.message);
    res.status(500).json({ error: "Failed to process query.", details: err.message });
  }
});

export default router;
