// src/controllers/query.controller.ts
import { Request, Response, NextFunction } from 'express';
import { fetchAIQuery } from '../services/ai.service';

export const processQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_query } = req.body;

    if (!user_query || typeof user_query !== "string") {
      res.status(400).json({ error: "Missing or invalid user query." });
      return;
    }

    const sqlQuery = await fetchAIQuery(user_query); // ✅ Use `fetchAIQuery` instead
    res.json({ sql_query: sqlQuery });
  } catch (error) {
    console.error("AI Query Error:", error);
    res.status(500).json({ error: "Failed to process query." });
  }
};
