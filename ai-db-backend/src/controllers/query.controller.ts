// src/controllers/query.controller.ts
import { Request, Response, NextFunction } from 'express';
import { generateSQLQuery } from '../services/ai.service';

export const processQuery = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { question } = req.body;
    const query = await generateSQLQuery(question);
    res.json({ query });
    return; // Explicitly return void
  } catch (error) {
    res.status(500).json({ message: 'Error processing query', error });
    return;
  }
};
