import { Router, Request, Response } from "express";
import { fetchAIQuery } from "../services/ai.service";
import { verifyToken } from "../middleware/auth";
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
 *     summary: Process AI-generated SQL queries
 *     tags: [AI Queries]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_query:
 *                 type: string
 *                 example: "How many users signed up last month?"
 *     responses:
 *       200:
 *         description: AI-generated SQL query
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sql_query:
 *                   type: string
 *                   example: "SELECT COUNT(*) FROM users WHERE signup_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');"
 *       400:
 *         description: Bad request (missing or invalid input)
 *       403:
 *         description: Unauthorized (User not logged in)
 *       429:
 *         description: Too many requests (Rate limit exceeded)
 *       500:
 *         description: Internal server error
 */
router.post("/ai-query", verifyToken, queryLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    let { user_query } = req.body;

    if (!user_query || typeof user_query !== "string") {
      logger.warn("⚠️ Invalid AI Query Attempt");
      res.status(400).json({ error: "Missing or invalid user query." });
      return;
    }

    // ✅ Sanitize input to prevent SQL injection attempts
    user_query = user_query.replace(/['";]/g, ""); 

    logger.info(`🔍 AI Query Received: ${user_query}`);

    const sqlQuery = await fetchAIQuery(user_query);
    res.json({ sql_query: sqlQuery });
  } catch (error) {
    logger.error("❌ AI Query Processing Failed:", error);
    res.status(500).json({ error: "Failed to process query." });
  }
});

export default router;
