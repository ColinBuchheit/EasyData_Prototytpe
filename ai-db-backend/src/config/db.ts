import { Pool } from 'pg';
import { ENV } from './env';
import logger from './logger';

// ✅ Ensure DB_TYPE is included for multi-DB support (future-proofing)
if (!ENV.DB_TYPE) {
  throw new Error("❌ Missing DB_TYPE in environment variables.");
}

const pool = new Pool({
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  user: ENV.DB_USER,
  password: ENV.DB_PASSWORD,
  database: ENV.DB_DATABASE,
  max: 10, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Wait 2 seconds before timing out
});

pool.on('connect', () => {
  logger.info('✅ Database connected successfully.');
});

pool.on('error', (err) => {
  logger.error('❌ Unexpected error on idle database client:', err);
  process.exit(1);
});

export default pool;
