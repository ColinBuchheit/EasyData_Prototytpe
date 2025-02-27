// src/routes/db.routes.ts
import { Router } from 'express';
import pool from '../config/db';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Database
 *   description: Database connectivity testing
 */

/**
 * @swagger
 * /api/db-test:
 *   get:
 *     summary: Test database connectivity
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Database connection successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Database connection failed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.get('/db-test', async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()'); // A simple test query
    client.release();
    res.json({ message: 'Database connection successful!' });
    return;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'Database connection failed', error: errorMsg });
    return;
  }
});

export default router;
