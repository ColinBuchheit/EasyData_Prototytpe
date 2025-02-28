// src/services/dbDrivers/mysqlDriver.ts
import mysql from 'mysql2/promise';
import logger from '../../config/logger';
import { DBConfig } from '../connectionmanager';

export const connectMySQL = async (config: DBConfig) => {
  try {
    const connection = await mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: 10,
    });
    // Test the connection:
    await connection.query('SELECT 1');
    logger.info('MySQL connection established.');
    return connection;
  } catch (error) {
    logger.error('Failed to connect to MySQL', error);
    throw error;
  }
};
