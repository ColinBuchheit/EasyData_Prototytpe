// src/modules/database/services/connections.service.ts

import { pool } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { DatabaseConnectionConfig, UserDatabase } from "../models/connection.model";
import { getClientForDB } from "./clients";
import { encrypt, decrypt } from "../../../shared/utils/encryption";
import { DatabaseType } from "../models/database.types.model";

const connectionsLogger = createContextLogger("ConnectionsService");

/**
 * Service for managing user database connections
 */
export class ConnectionsService {
  /**
   * Create a new database connection
   */
  static async createConnection(userId: number, config: DatabaseConnectionConfig): Promise<UserDatabase> {
    try {
      const encryptedPassword = encrypt(config.password);
      
      const result = await pool.query(
        `INSERT INTO user_databases 
        (user_id, connection_name, db_type, host, port, username, encrypted_password, database_name, is_connected) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING id, db_type, host, port, username, database_name, is_connected, created_at`,
        [
          userId, 
          config.connectionName || config.dbName, 
          config.dbType, 
          config.host, 
          config.port, 
          config.username, 
          encryptedPassword, 
          config.dbName, 
          false
        ]
      );

      connectionsLogger.info(`New database connection added for User ${userId}`);
      return result.rows[0];
    } catch (error) {
      connectionsLogger.error(`Failed to encrypt database password: ${(error as Error).message}`);
      throw new Error("Failed to securely store database credentials");
    }
  }

  /**
   * Fetch all databases owned by the user
   */
  static async getUserConnections(userId: number): Promise<UserDatabase[]> {
    try {
      const result = await pool.query(
        `SELECT id, user_id, connection_name, db_type, host, port, username, encrypted_password, database_name, 
        is_connected, created_at, updated_at 
        FROM user_databases WHERE user_id = $1`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      connectionsLogger.error(`Error fetching user databases: ${(error as Error).message}`);
      throw new Error("Failed to fetch user databases.");
    }
  }

  /**
   * Get a specific database connection by ID
   */
  static async getConnectionById(userId: number, dbId: number): Promise<UserDatabase | null> {
    try {
      const result = await pool.query(
        `SELECT id, user_id, connection_name, db_type, host, port, username, encrypted_password, database_name, 
        is_connected, created_at, updated_at 
        FROM user_databases WHERE id = $1 AND user_id = $2`,
        [dbId, userId]
      );

      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      connectionsLogger.error(`Error fetching database connection ID ${dbId}: ${(error as Error).message}`);
      throw new Error("Failed to fetch database connection.");
    }
  }

  /**
   * Get database with decrypted password
   * Helper method to get database with decrypted password for client operations
   */
  static async getConnectionWithDecryptedPassword(userId: number, dbId: number): Promise<UserDatabase | null> {
    const db = await this.getConnectionById(userId, dbId);
    
    if (!db) {
      return null;
    }
    
    // Create a new object with the decrypted password
    try {
      if (db.encrypted_password) {
        return {
          ...db,
          // Store decrypted password in the same field for client usage
          // This won't be persisted to the database
          encrypted_password: decrypt(db.encrypted_password)
        };
      }
      return db;
    } catch (error) {
      connectionsLogger.error(`Failed to decrypt database password for ${dbId}: ${(error as Error).message}`);
      throw new Error("Failed to authenticate with database: Password decryption failed");
    }
  }

  // Add new method for transactions
  static async executeTransactionQueries(
    db: UserDatabase, 
    queries: string[]
  ): Promise<any[]> {
    try {
      // Make sure we're using a database with decrypted password
      let dbWithDecryptedPassword = db;
      
      // If the password is still encrypted, decrypt it
      if (db.encrypted_password && !db.encrypted_password.includes("decrypted:")) {
        try {
          dbWithDecryptedPassword = {
            ...db,
            encrypted_password: decrypt(db.encrypted_password)
          };
        } catch (error) {
          connectionsLogger.error(`Failed to decrypt password for transaction: ${(error as Error).message}`);
          throw new Error("Failed to authenticate with database: Password decryption failed");
        }
      }
      
      const client = getClientForDB(db.db_type as DatabaseType);
      
      // Check if this client has transaction support
      if (!client.beginTransaction || !client.commitTransaction || !client.rollbackTransaction || !client.executeInTransaction) {
        // Fall back to individual queries if transactions aren't supported
        connectionsLogger.warn(`Transactions not supported for ${db.db_type} database. Executing queries individually.`);
        
        const results = [];
        for (const query of queries) {
          const result = await client.runQuery(dbWithDecryptedPassword, query);
          results.push(result);
        }
        return results;
      }
      
      // Execute transaction
      const transaction = await client.beginTransaction(dbWithDecryptedPassword);
      
      try {
        const results = [];
        for (const query of queries) {
          const result = await client.executeInTransaction(transaction, query);
          results.push(result);
        }
        
        await client.commitTransaction(transaction);
        return results;
      } catch (error) {
        if (client.rollbackTransaction) {
          await client.rollbackTransaction(transaction);
        }
        throw error;
      }
    } catch (error) {
      connectionsLogger.error(`Transaction execution failed: ${(error as Error).message}`);
      throw new Error(`Transaction failed: ${(error as Error).message}`);
    }
  }

  /**
   * Update a database connection's details
   */
  static async updateConnection(
    userId: number, 
    dbId: number, 
    data: Partial<DatabaseConnectionConfig>
  ): Promise<UserDatabase | null> {
    try {
      const fields = [];
      const values: any[] = [];

      if (data.connectionName) {
        fields.push(`connection_name = $${fields.length + 1}`);
        values.push(data.connectionName);
      }
      if (data.dbType) {
        fields.push(`db_type = $${fields.length + 1}`);
        values.push(data.dbType);
      }
      if (data.host) {
        fields.push(`host = $${fields.length + 1}`);
        values.push(data.host);
      }
      if (data.port) {
        fields.push(`port = $${fields.length + 1}`);
        values.push(data.port);
      }
      if (data.username) {
        fields.push(`username = $${fields.length + 1}`);
        values.push(data.username);
      }
      if (data.password) {
        fields.push(`encrypted_password = $${fields.length + 1}`);
        values.push(encrypt(data.password));
      }
      if (data.dbName) {
        fields.push(`database_name = $${fields.length + 1}`);
        values.push(data.dbName);
      }

      if (fields.length === 0) {
        throw new Error("No valid fields to update.");
      }

      fields.push(`updated_at = NOW()`);

      values.push(dbId);
      values.push(userId);
      
      const query = `UPDATE user_databases SET ${fields.join(", ")} 
                     WHERE id = $${values.length - 1} AND user_id = $${values.length} 
                     RETURNING id, user_id, connection_name, db_type, host, port, 
                     username, database_name, is_connected, created_at, updated_at`;

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      connectionsLogger.error(`Error updating database connection ID ${dbId}: ${(error as Error).message}`);
      throw new Error("Failed to update database connection.");
    }
  }

  /**
   * Delete a database connection
   */
  static async deleteConnection(userId: number, dbId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        "DELETE FROM user_databases WHERE id = $1 AND user_id = $2 RETURNING id",
        [dbId, userId]
      );
      
      // Fix for TypeScript error: handle potential null value
      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        connectionsLogger.info(`Database connection ID ${dbId} deleted for User ${userId}`);
      }
      
      return deleted;
    } catch (error) {
      connectionsLogger.error(`Error deleting database connection ID ${dbId}: ${(error as Error).message}`);
      throw new Error("Failed to delete database connection.");
    }
  }

  /**
   * Test a database connection
   */
  static async testConnection(userId: number, config: DatabaseConnectionConfig): Promise<{ success: boolean; message: string }> {
    try {
      // Create a temporary database object
      const tempDb: UserDatabase = {
        id: -1,
        user_id: userId,
        connection_name: config.connectionName || "Test Connection",
        db_type: config.dbType,
        host: config.host,
        port: config.port,
        username: config.username,
        encrypted_password: config.password, // Use unencrypted password for testing
        database_name: config.dbName,
        is_connected: false,
        created_at: new Date()
      };

      // Get the appropriate client for this database type
      const client = getClientForDB(config.dbType);
      
      // Test the connection
      await client.testConnection(tempDb);
      
      return { success: true, message: "Connection successful!" };
    } catch (error) {
      connectionsLogger.error(`Connection test failed: ${(error as Error).message}`);
      return { success: false, message: `Connection failed: ${(error as Error).message}` };
    }
  }

  /**
   * Execute a query on a specific user database connection
   */
  static async executeQuery(db: UserDatabase, query: string): Promise<any> {
    try {
      // Make sure we're using a database with decrypted password
      let dbWithDecryptedPassword = db;
      
      // If the password is still encrypted, decrypt it
      if (db.encrypted_password && !db.encrypted_password.includes("decrypted:")) {
        try {
          dbWithDecryptedPassword = {
            ...db,
            encrypted_password: decrypt(db.encrypted_password)
          };
        } catch (error) {
          connectionsLogger.error(`Failed to decrypt password for query: ${(error as Error).message}`);
          throw new Error("Failed to authenticate with database: Password decryption failed");
        }
      }
      
      const client = getClientForDB(db.db_type as DatabaseType);
      return await client.runQuery(dbWithDecryptedPassword, query);
    } catch (error) {
      connectionsLogger.error(`Query execution failed: ${(error as Error).message}`);
      throw new Error(`Query execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch tables from a specific user database connection
   */
  static async fetchTablesFromConnection(db: UserDatabase): Promise<string[]> {
    try {
      // Make sure we're using a database with decrypted password
      let dbWithDecryptedPassword = db;
      
      // If the password is still encrypted, decrypt it
      if (db.encrypted_password && !db.encrypted_password.includes("decrypted:")) {
        try {
          dbWithDecryptedPassword = {
            ...db,
            encrypted_password: decrypt(db.encrypted_password)
          };
        } catch (error) {
          connectionsLogger.error(`Failed to decrypt password for fetching tables: ${(error as Error).message}`);
          throw new Error("Failed to authenticate with database: Password decryption failed");
        }
      }
      
      const client = getClientForDB(db.db_type as DatabaseType);
      return await client.fetchTables(dbWithDecryptedPassword);
    } catch (error) {
      connectionsLogger.error(`Error fetching tables from connection: ${(error as Error).message}`);
      throw new Error(`Failed to fetch tables: ${(error as Error).message}`);
    }
  }

  static async getAllConnections(): Promise<UserDatabase[]> {
    try {
      const result = await pool.query(
        `SELECT id, user_id, connection_name, db_type, host, port, username, encrypted_password, database_name, 
        is_connected, created_at, updated_at 
        FROM user_databases`
      );
      return result.rows;
    } catch (error) {
      connectionsLogger.error(`Error fetching all databases: ${(error as Error).message}`);
      throw new Error("Failed to fetch all databases.");
    }
  }

  /**
   * Fetch schema for a specific table from a user database connection
   */
  static async fetchSchemaFromConnection(db: UserDatabase, table: string): Promise<any> {
    try {
      // Make sure we're using a database with decrypted password
      let dbWithDecryptedPassword = db;
      
      // If the password is still encrypted, decrypt it
      if (db.encrypted_password && !db.encrypted_password.includes("decrypted:")) {
        try {
          dbWithDecryptedPassword = {
            ...db,
            encrypted_password: decrypt(db.encrypted_password)
          };
        } catch (error) {
          connectionsLogger.error(`Failed to decrypt password for fetching schema: ${(error as Error).message}`);
          throw new Error("Failed to authenticate with database: Password decryption failed");
        }
      }
      
      const client = getClientForDB(db.db_type as DatabaseType);
      return await client.fetchSchema(dbWithDecryptedPassword, table);
    } catch (error) {
      connectionsLogger.error(`Error fetching schema from connection: ${(error as Error).message}`);
      throw new Error(`Failed to fetch schema: ${(error as Error).message}`);
    }
  }
}

export default ConnectionsService;