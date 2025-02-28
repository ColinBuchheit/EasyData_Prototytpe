// src/routes/db.routes.ts
import { Router, Request, Response } from 'express';
import { ConnectionManager } from '../services/connectionmanager';
import { verifyToken } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();
let connectionManager: ConnectionManager | null = null;

/**
 * @swagger
 * tags:
 *   name: Database
 *   description: API for database connection and schema retrieval
 */

/**
 * @swagger
 * /api/db/connect:
 *   post:
 *     summary: Connect to a database
 *     tags: [Database]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dbType:
 *                 type: string
 *                 enum: [postgres, mysql, mssql, sqlite]
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               user:
 *                 type: string
 *               password:
 *                 type: string
 *               database:
 *                 type: string
 *             required: [dbType, host, port, user, password, database]
 *     responses:
 *       200:
 *         description: Successfully connected to the database.
 *       400:
 *         description: Missing parameters.
 *       500:
 *         description: Database connection failed.
 */
router.post('/connect', verifyToken, async (req: Request, res: Response) => {
  try {
    const { dbType, host, port, user, password, database } = req.body;

    if (!dbType || !host || !user || !database) {
      res.status(400).json({ message: '❌ Missing required parameters.' });
      return;
    }

    connectionManager = new ConnectionManager({ dbType, host, port, user, password, database });
    await connectionManager.connect();

    res.json({ message: `✅ Connected to ${dbType} database successfully.` });
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    res.status(500).json({ message: 'Database connection failed', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/db/test-connection:
 *   post:
 *     summary: Test connection to a database
 *     tags: [Database]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dbType:
 *                 type: string
 *                 enum: [postgres, mysql, mssql, sqlite]
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               user:
 *                 type: string
 *               password:
 *                 type: string
 *               database:
 *                 type: string
 *             required: [dbType, host, port, user, password, database]
 *     responses:
 *       200:
 *         description: Successfully tested database connection.
 *       500:
 *         description: Database connection test failed.
 */
router.post('/test-connection', verifyToken, async (req: Request, res: Response) => {
  try {
    const { dbType, host, port, user, password, database } = req.body;
    
    connectionManager = new ConnectionManager({ dbType, host, port, user, password, database });
    await connectionManager.connect();

    res.json({ message: `✅ Connected to ${dbType} successfully.` });
  } catch (error) {
    logger.error('❌ Database connection test failed:', error);
    res.status(500).json({ message: 'Database connection test failed', error: (error as Error).message });
  } finally {
    if (connectionManager) {
      await connectionManager.disconnect();
      connectionManager = null;
    }
  }
});

/**
 * @swagger
 * /api/db/schema:
 *   get:
 *     summary: Retrieve database schema
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Successfully retrieved schema.
 *       400:
 *         description: No active database connection.
 *       500:
 *         description: Failed to retrieve schema.
 */
router.get('/schema', verifyToken, (req: Request, res: Response) => {
  try {
    if (!connectionManager) {
      res.status(400).json({ message: '❌ No active database connection.' });
      return;
    }

    const schema = connectionManager.getSchema();
    res.json({ schema });
  } catch (error) {
    logger.error('❌ Failed to retrieve schema:', error);
    res.status(500).json({ message: 'Failed to retrieve schema', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/db/disconnect:
 *   post:
 *     summary: Disconnect from the database
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Successfully disconnected from the database.
 *       400:
 *         description: No active database connection.
 *       500:
 *         description: Database disconnection failed.
 */
router.post('/disconnect', verifyToken, async (req: Request, res: Response) => {
  try {
    if (!connectionManager) {
      res.status(400).json({ message: '❌ No active database connection to disconnect.' });
      return;
    }

    await connectionManager.disconnect();
    connectionManager = null;
    res.json({ message: '✅ Database disconnected successfully.' });
  } catch (error) {
    logger.error('❌ Database disconnection failed:', error);
    res.status(500).json({ message: 'Database disconnection failed', error: (error as Error).message });
  }
});

export default router;
