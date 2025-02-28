// src/services/dbDrivers/mssqlDriver.ts
import sql from 'mssql';
import logger from '../../config/logger';
import { DBConfig } from '../connectionmanager';

export const connectMSSQL = async (config: DBConfig): Promise<sql.ConnectionPool> => {
  const poolConfig: sql.config = {
    user: config.user,
    password: config.password,
    server: config.host, // For named instances, include the instance name in the host (e.g., 'localhost\\SQLEXPRESS')
    database: config.database,
    port: config.port,
    options: {
      encrypt: true,               // Set true if using Azure or if encryption is required
      trustServerCertificate: true // For local development, you might set this to true
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  try {
    const pool = await sql.connect(poolConfig);
    // Optionally, run a test query to verify connection
    const result = await pool.request().query('SELECT GETDATE() AS currentDate');
    logger.info('MSSQL connection established. Current date:', result.recordset[0].currentDate);
    return pool;
  } catch (error) {
    logger.error('Failed to connect to MSSQL', error);
    throw error;
  }
};
