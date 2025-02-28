// src/services/dbDrivers/sqliteDriver.ts
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import logger from '../../config/logger';
import { DBConfig } from '../connectionmanager';

export const connectSQLite = async (config: DBConfig): Promise<Database> => {
  try {
    // For SQLite, the "database" field will be the file path to the database.
    // Other fields (host, port, user, password) are typically not used.
    const db = await open({
      filename: config.database,
      driver: sqlite3.Database,
    });
    // Test the connection with a simple query.
    const row = await db.get('SELECT 1 as result');
    logger.info('SQLite connection established. Test query result:', row);
    return db;
  } catch (error) {
    logger.error('Failed to connect to SQLite', error);
    throw error;
  }
};
