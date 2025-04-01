// src/modules/database/services/clients/mysqlClient.ts
import { IDatabaseClient, handleDatabaseError, HealthCheckResult } from "./interfaces";
import { UserDatabase } from "../../models/connection.model";
import mysql from "mysql2/promise";
import logger from "../../../../config/logger";
import { connectWithRetry } from "../../../../shared/utils/connectionHelpers";
import { connectionCache, getConnectionKey } from "./adapter";

function getConnectionConfig(db: UserDatabase): mysql.ConnectionOptions {
  if (!db.host || !db.port || !db.username || !db.encrypted_password || !db.database_name) {
    throw new Error("❌ Missing MySQL connection fields.");
  }

  return {
    host: db.host,
    port: db.port,
    user: db.username,
    password: db.encrypted_password,
    database: db.database_name,
    // Add timeouts for better error handling
    connectTimeout: 10000, // 10 seconds
    connectionLimit: 10,
    queueLimit: 0,
    // Use prepared statements by default for security
    namedPlaceholders: true
  };
}

export const mysqlClient: IDatabaseClient = {
  async connect(db: UserDatabase) {
    const key = getConnectionKey(db);
    
    if (!connectionCache[key]) {
      try {
        const connection = await connectWithRetry(
          async () => {
            const conn = await mysql.createConnection(getConnectionConfig(db));
            // Verify connection
            await conn.query("SELECT 1");
            return conn;
          },
          `MySQL (${db.connection_name || db.database_name})`
        );
        
        connectionCache[key] = connection;
      } catch (error) {
        const dbError = handleDatabaseError('connect', error, 'MySQL');
        logger.error(`❌ MySQL connection error: ${dbError.message}`);
        throw dbError;
      }
    }
    
    return connectionCache[key];
  },

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const connection = await this.connect(db);
    
    try {
      const [rawRows] = await connection.query("SHOW TABLES");
      const rows = rawRows as Record<string, any>[];
      const tableKey = Object.keys(rows[0])[0]; // e.g., "Tables_in_mydb"
      
      return rows.map(row => row[tableKey]);
    } catch (error) {
      const dbError = handleDatabaseError('fetchTables', error, 'MySQL');
      logger.error(`❌ Error fetching MySQL tables: ${dbError.message}`);
      throw dbError;
    }
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const connection = await this.connect(db);
    
    try {
      // Sanitize table name to prevent SQL injection
      const sanitizedTable = this.sanitizeInput(table);
      
      const [rows] = await connection.query(`DESCRIBE \`${sanitizedTable}\``);
      return rows;
    } catch (error) {
      const dbError = handleDatabaseError('fetchSchema', error, 'MySQL');
      logger.error(`❌ Error fetching schema for MySQL table ${table}: ${dbError.message}`);
      throw dbError;
    }
  },

  async runQuery(db: UserDatabase, query: string, params?: any[]): Promise<any> {
    const connection = await this.connect(db);
    
    try {
      // For security, always use parameterized queries when params are provided
      if (params && Array.isArray(params)) {
        const [rows] = await connection.query(query, params);
        return rows;
      } else {
        const [rows] = await connection.query(query);
        return rows;
      }
    } catch (error) {
      const dbError = handleDatabaseError('query', error, 'MySQL', query);
      logger.error(`❌ Error executing MySQL query: ${dbError.message}`);
      throw dbError;
    }
  },
  
  async disconnect(db: UserDatabase): Promise<void> {
    const key = getConnectionKey(db);
    const connection = connectionCache[key];
    
    if (connection) {
      try {
        await connection.end();
        delete connectionCache[key];
        logger.info(`✅ MySQL connection closed for ${db.connection_name || db.database_name}`);
      } catch (error) {
        const dbError = handleDatabaseError('disconnect', error, 'MySQL');
        logger.error(`❌ Error disconnecting from MySQL: ${dbError.message}`);
        throw dbError;
      }
    }
  },

  async testConnection(db: UserDatabase): Promise<boolean> {
    try {
      const conn = await mysql.createConnection(getConnectionConfig(db));
      await conn.query("SELECT 1");
      await conn.end();
      return true;
    } catch (error) {
      logger.warn(`MySQL connection test failed: ${error.message}`);
      return false;
    }
  },

  async checkHealth(db: UserDatabase): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const connection = await mysql.createConnection(getConnectionConfig(db));
      
      // Test basic connectivity
      const [result] = await connection.query('SELECT 1 as val');
      const isConnected = Array.isArray(result) && result.length > 0 && (result[0] as any).val === 1;
      
      // Get server status
      const [statusResult] = await connection.query('SHOW STATUS LIKE "Threads_connected"');
      const threadsConnected = Array.isArray(statusResult) && statusResult.length > 0 ? 
        (statusResult[0] as any).Value : 'unknown';
      
      await connection.end();
      
      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      
      return {
        isHealthy: isConnected,
        latencyMs,
        message: `Connection healthy. Current connections: ${threadsConnected}`,
        timestamp: new Date()
      };
    } catch (error) {
      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      
      return {
        isHealthy: false,
        latencyMs,
        message: `Health check failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  },

  // Add transaction support
  async beginTransaction(db: UserDatabase): Promise<mysql.Connection> {
    try {
      const connection = await this.connect(db);
      await connection.beginTransaction();
      return connection;
    } catch (error) {
      const dbError = handleDatabaseError('transaction', error, 'MySQL');
      logger.error(`❌ Error beginning MySQL transaction: ${dbError.message}`);
      throw dbError;
    }
  },

  async commitTransaction(transaction: mysql.Connection): Promise<void> {
    try {
      await transaction.commit();
    } catch (error) {
      const dbError = handleDatabaseError('transaction', error, 'MySQL');
      logger.error(`❌ Error committing MySQL transaction: ${dbError.message}`);
      throw dbError;
    }
  },

  async rollbackTransaction(transaction: mysql.Connection): Promise<void> {
    try {
      await transaction.rollback();
    } catch (error) {
      const dbError = handleDatabaseError('transaction', error, 'MySQL');
      logger.error(`❌ Error rolling back MySQL transaction: ${dbError.message}`);
      // We don't re-throw here since this is already error recovery
      logger.error(`Transaction rollback failed, but continuing...`);
    }
  },

  async executeInTransaction(transaction: mysql.Connection, query: string, params?: any[]): Promise<any> {
    try {
      if (params && Array.isArray(params)) {
        const [rows] = await transaction.query(query, params);
        return rows;
      } else {
        const [rows] = await transaction.query(query);
        return rows;
      }
    } catch (error) {
      const dbError = handleDatabaseError('query', error, 'MySQL', query);
      logger.error(`❌ Error executing MySQL query in transaction: ${dbError.message}`);
      throw dbError;
    }
  },

  // Utility function to sanitize inputs and prevent SQL injection
  sanitizeInput(input: string): string {
    if (!input) return '';
    
    // Remove dangerous characters that could be used for SQL injection
    return input
      .replace(/['"`\\%;]/g, '') // Remove quotes, semicolons, etc.
      .replace(/--/g, '')        // Remove comment markers
      .replace(/\/\*/g, '')      // Remove block comment markers
      .replace(/\*\//g, '')
      .trim();
  }
};