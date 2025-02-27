import { Pool } from 'pg';
import { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE } from './env';
import logger from './logger';

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
