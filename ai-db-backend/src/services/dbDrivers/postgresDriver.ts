// src/services/dbDrivers/postgresDriver.ts
import { Pool, PoolConfig } from 'pg';
import logger from '../../config/logger';
import { DBConfig } from '../connectionmanager';

export const connectPostgres = async (config: DBConfig): Promise<Pool> => {
  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    max: 10,
    idleTimeoutMillis: 30000,
  };

  const pool = new Pool(poolConfig);
  try {
    const client = await pool.connect();
    client.release();
    logger.info('PostgreSQL connection established.');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL', error);
    throw error;
  }
  return pool;
};
