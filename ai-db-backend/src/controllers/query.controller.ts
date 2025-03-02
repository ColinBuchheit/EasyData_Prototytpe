import { AuthRequest } from "../middleware/auth"; // ✅ Import correct request type
import { Response } from "express";
import { executeAIQuery } from "../services/ai.service"; // ✅ Correct function name
import { getSession } from "../services/dbSession.service"; // ✅ Validate sessions before executing queries
import logger from "../config/logger";

/**
 * Processes AI-generated query requests.
 */
export const processQuery = async (req: AuthRequest, res: Response): Promise<void> => { // ✅ Use AuthRequest instead of Request
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
};
