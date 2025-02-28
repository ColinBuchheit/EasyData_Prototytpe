import { Request, Response } from 'express';
import { ConnectionManager } from '../services/connectionmanager';
import logger from '../config/logger';

let connectionManager: ConnectionManager | null = null;

/**
 * Connects to a database.
 */
export const connectDatabase = async (req: Request, res: Response): Promise<void> => {
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
    const err = error as Error;
    logger.error('❌ Database connection failed:', err);
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
};

/**
 * Retrieves the database schema.
 */
export const getDatabaseSchema = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!connectionManager) {
      res.status(400).json({ message: '❌ No active database connection.' });
      return;
    }

    const schema = await connectionManager.getSchema();
    res.json({ schema });
  } catch (error) {
    const err = error as Error;
    logger.error('❌ Failed to retrieve schema:', err);
    res.status(500).json({ message: 'Failed to retrieve schema', error: err.message });
  }
};

/**
 * Disconnects from the database.
 */
export const disconnectDatabase = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!connectionManager) {
      res.status(400).json({ message: '❌ No active database connection to disconnect.' });
      return;
    }

    await connectionManager.disconnect();
    connectionManager = null;
    res.json({ message: '✅ Database disconnected successfully.' });
  } catch (error) {
    const err = error as Error;
    logger.error('❌ Database disconnection failed:', err);
    res.status(500).json({ message: 'Database disconnection failed', error: err.message });
  }
};
