// src/modules/database/services/schema.service.ts

import { pool } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { getMongoClient } from "../../../config/db";
import axios from "axios";
import { ConnectionsService } from "./connections.service";
import { DatabaseMetadata, SchemaValidationResult } from "../models/schema.model";
import { DatabaseType } from "../models/database.types.model";
import { 
  UnifiedSchema, 
  convertToUnifiedSchema 
} from "../models/unified-schema.model";

const schemaLogger = createContextLogger("SchemaService");

/**
 * Service for schema analysis and validation
 */
export class SchemaService {
  /**
   * Extract table names from a SQL query
   */
  static extractTablesFromQuery(query: string): string[] {
    // Enhanced regex to catch more SQL patterns
    const regex = /\bFROM\s+([a-zA-Z0-9_]+)|\bJOIN\s+([a-zA-Z0-9_]+)|\bUPDATE\s+([a-zA-Z0-9_]+)|\bINTO\s+([a-zA-Z0-9_]+)/gi;
    let match;
    const tables: string[] = [];

    while ((match = regex.exec(query)) !== null) {
      // Find the non-null capture group (there will be only one per match)
      const tableName = match[1] || match[2] || match[3] || match[4];
      if (tableName && !tables.includes(tableName)) {
        tables.push(tableName);
      }
    }

    return tables;
  }

  /**
   * Fetch all tables for a database type
   */
  static async fetchAllTables(dbType: DatabaseType): Promise<string[]> {
    try {
      let query = "";
      
      if (dbType === "postgres") {
        query = "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';";
      } else if (dbType === "mysql") {
        query = "SHOW TABLES;";
      } else {
        throw new Error("Unsupported database type.");
      }

      const result = await pool.query(query);
      return result.rows.map((row: Record<string, string>) => Object.values(row)[0] as string);
    } catch (error) {
      schemaLogger.error(`Error fetching tables: ${(error as Error).message}`);
      throw new Error("Failed to fetch tables.");
    }
  }

  /**
   * Fetch schema details for a specific table
   */
  static async fetchTableSchema(dbType: DatabaseType, tableName: string): Promise<any[]> {
    try {
      let query = "";

      if (dbType === "postgres") {
        query = `
          SELECT column_name, data_type, is_nullable, character_maximum_length 
          FROM information_schema.columns 
          WHERE table_name = $1;
        `;
      } else if (dbType === "mysql") {
        query = `DESCRIBE ${tableName};`;
      } else {
        throw new Error("Unsupported database type.");
      }

      const result = await pool.query(query, dbType === "postgres" ? [tableName] : []);
      return result.rows;
    } catch (error) {
      schemaLogger.error(`Error fetching schema for table ${tableName}: ${(error as Error).message}`);
      throw new Error("Failed to fetch table schema.");
    }
  }

  /**
   * Validate a query against the database schema
   */
  static async validateQueryAgainstSchema(query: string, dbType: DatabaseType): Promise<SchemaValidationResult> {
    try {
      const schemaTables = await this.fetchAllTables(dbType);

      // Extract tables from the query
      const queryTables = this.extractTablesFromQuery(query);
      
      // Ensure all tables in the query exist in the schema
      const unknownTables = queryTables.filter(table => !schemaTables.includes(table));
      const isValidTableUsage = unknownTables.length === 0;
      
      // Only allow certain operations (SELECT by default)
      const normalizedQuery = query.trim().toUpperCase();
      const isSelectOnly = normalizedQuery.startsWith("SELECT");
      
      // Add more sophisticated SQL injection checks
      const hasSuspiciousPatterns = /;\s*(UPDATE|DELETE|INSERT|DROP|ALTER|CREATE)\b/i.test(query);
      
      if (!isValidTableUsage) {
        schemaLogger.warn(`Query validation failed. Unknown tables: ${unknownTables.join(', ')}`);
        return {
          isValid: false,
          message: `Query references unknown tables: ${unknownTables.join(', ')}`,
          invalidTables: unknownTables
        };
      }

      if (!isSelectOnly) {
        schemaLogger.warn("Query validation failed: Non-SELECT operations are not allowed.");
        return {
          isValid: false,
          message: "Only SELECT operations are allowed."
        };
      }
      
      if (hasSuspiciousPatterns) {
        schemaLogger.warn("Query validation failed: Potential SQL injection detected.");
        return {
          isValid: false,
          message: "Potentially unsafe query patterns detected."
        };
      }

      return { isValid: true };
    } catch (error) {
      schemaLogger.error(`Query Schema Validation Failed: ${(error as Error).message}`);
      return {
        isValid: false,
        message: `Validation error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Analyze and store database schema metadata
   */
  static async analyzeAndStoreDbSchema(userId: number, dbId: number): Promise<DatabaseMetadata | null> {
    try {
      // Fetch database details
      const db = await ConnectionsService.getConnectionById(userId, dbId);
      if (!db) return null;
      
      // Get tables from the user's database
      const tables = await ConnectionsService.fetchTablesFromConnection(db);
      if (!tables.length) return null;
      
      // Create schema structure to analyze
      const schemaDetails = [];
      const columnsMap: Record<string, any[]> = {};
      
      for (const table of tables) {
        const columns = await ConnectionsService.fetchSchemaFromConnection(db, table);
        schemaDetails.push({
          table,
          columns
        });
        columnsMap[table] = columns;
      }
      
      // Convert to unified schema format
      const unifiedSchema = convertToUnifiedSchema(
        dbId,
        db.database_name,
        db.db_type,
        tables,
        columnsMap
      );
      
      // Ask AI to analyze the schema
      const aiResponse = await axios.post(process.env.AI_AGENT_URL + "/run", {
        operation: "analyze_schema",
        userId,
        dbId,
        dbType: db.db_type,
        dbName: db.database_name,
        schemaDetails,
        unifiedSchema
      });
      
      if (!aiResponse.data.success) {
        schemaLogger.error(`AI schema analysis failed for database ${dbId}`);
        return null;
      }
      
      const metadata: DatabaseMetadata = {
        userId,
        dbId,
        dbType: db.db_type,
        dbName: db.database_name,
        tables: aiResponse.data.tables,
        domainType: aiResponse.data.domainType,
        contentDescription: aiResponse.data.contentDescription,
        dataCategory: aiResponse.data.dataCategory,
        updatedAt: new Date()
      };
      
      // Store in MongoDB
      const client = await getMongoClient();
      await client.db().collection('database_metadata').updateOne(
        { dbId, userId },
        { $set: metadata },
        { upsert: true }
      );
      
      schemaLogger.info(`Database schema analyzed and metadata stored for DB ${dbId}`);
      return metadata;
    } catch (error) {
      schemaLogger.error(`Error analyzing database schema: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get database metadata
   */
  static async getDbMetadata(userId: number, dbId: number): Promise<DatabaseMetadata | null> {
    try {
      const client = await getMongoClient();
      const document = await client.db().collection('database_metadata')
        .findOne({ dbId, userId });
      
      if (!document) return null;
      
      // Properly convert MongoDB document to DatabaseMetadata
      return {
        dbId: document.dbId,
        userId: document.userId,
        dbType: document.dbType,
        dbName: document.dbName,
        tables: document.tables || [],
        domainType: document.domainType || "",
        contentDescription: document.contentDescription || "",
        dataCategory: document.dataCategory || [],
        updatedAt: document.updatedAt || new Date()
      } as DatabaseMetadata;
    } catch (error) {
      schemaLogger.error(`Error retrieving database metadata: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get all database metadata for a user
   */
  static async getAllDbMetadata(userId: number): Promise<DatabaseMetadata[]> {
    try {
      const client = await getMongoClient();
      const documents = await client.db().collection('database_metadata')
        .find({ userId })
        .toArray();
      
      // Explicitly map MongoDB documents to DatabaseMetadata array
      return documents.map(doc => ({
        dbId: doc.dbId,
        userId: doc.userId,
        dbType: doc.dbType,
        dbName: doc.dbName,
        tables: doc.tables || [],
        domainType: doc.domainType || "",
        contentDescription: doc.contentDescription || "",
        dataCategory: doc.dataCategory || [],
        updatedAt: doc.updatedAt || new Date()
      } as DatabaseMetadata));
    } catch (error) {
      schemaLogger.error(`Error retrieving all database metadata: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Get database schema in unified format for shared use with AI agent
   */
  static async getUnifiedSchema(userId: number, dbId: number): Promise<UnifiedSchema | null> {
    try {
      // First check if we already have metadata
      const metadata = await this.getDbMetadata(userId, dbId);
      
      // Get database connection
      const db = await ConnectionsService.getConnectionById(userId, dbId);
      if (!db) {
        schemaLogger.error(`Database not found for user ${userId}, dbId ${dbId}`);
        return null;
      }
      
      // Get tables
      const tables = await ConnectionsService.fetchTablesFromConnection(db);
      if (!tables.length) {
        schemaLogger.warn(`No tables found for database ${dbId}`);
        return null;
      }
      
      // Get schema for each table
      const columnsMap: Record<string, any[]> = {};
      for (const table of tables) {
        try {
          columnsMap[table] = await ConnectionsService.fetchSchemaFromConnection(db, table);
        } catch (error) {
          schemaLogger.warn(`Error fetching schema for table ${table}: ${(error as Error).message}`);
          columnsMap[table] = [];
        }
      }
      
      // Convert to unified format
      const unifiedSchema = convertToUnifiedSchema(
        dbId,
        db.database_name,
        db.db_type,
        tables,
        columnsMap,
        metadata
      );
      
      return unifiedSchema;
    } catch (error) {
      schemaLogger.error(`Error generating unified schema: ${(error as Error).message}`);
      return null;
    }
  }
  
  /**
   * Get unified schemas for all databases of a user
   */
  static async getAllUnifiedSchemas(userId: number): Promise<UnifiedSchema[]> {
    try {
      // Get all user's databases
      const connections = await ConnectionsService.getUserConnections(userId);
      
      // Get all metadata in one query for efficiency
      const client = await getMongoClient();
      const allMetadata = await client.db().collection('database_metadata')
        .find({ userId })
        .toArray();
      
      // Create a map for quick lookup
      const metadataMap = new Map();
      allMetadata.forEach(doc => {
        metadataMap.set(doc.dbId, doc);
      });
      
      // Get unified schema for each database
      const schemas: UnifiedSchema[] = [];
      
      for (const connection of connections) {
        try {
          // Get metadata for this connection
          const metadata = metadataMap.get(connection.id);
          
          // Get tables
          const tables = await ConnectionsService.fetchTablesFromConnection(connection);
          if (!tables.length) continue;
          
          // Get schema for each table
          const columnsMap: Record<string, any[]> = {};
          for (const table of tables) {
            try {
              columnsMap[table] = await ConnectionsService.fetchSchemaFromConnection(connection, table);
            } catch (error) {
              columnsMap[table] = [];
            }
          }
          
          // Convert to unified format
          const unifiedSchema = convertToUnifiedSchema(
            connection.id,
            connection.database_name,
            connection.db_type,
            tables,
            columnsMap,
            metadata
          );
          
          schemas.push(unifiedSchema);
        } catch (error) {
          schemaLogger.warn(`Skipping schema for database ${connection.id}: ${(error as Error).message}`);
        }
      }
      
      return schemas;
    } catch (error) {
      schemaLogger.error(`Error retrieving all unified schemas: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Get database relationships (foreign keys)
   * This is a helper method to enhance the unified schema
   */
  static async getDatabaseRelationships(userId: number, dbId: number): Promise<any[]> {
    try {
      // Get database connection
      const db = await ConnectionsService.getConnectionById(userId, dbId);
      if (!db) return [];
      
      // Currently only implemented for PostgreSQL and MySQL
      if (db.db_type === 'postgres') {
        const query = `
          SELECT
            tc.table_name as table_name,
            kcu.column_name as column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY';
        `;
        
        const result = await ConnectionsService.executeQuery(db, query);
        return result;
      } 
      else if (db.db_type === 'mysql') {
        const query = `
          SELECT
            TABLE_NAME as table_name,
            COLUMN_NAME as column_name,
            REFERENCED_TABLE_NAME as foreign_table_name,
            REFERENCED_COLUMN_NAME as foreign_column_name
          FROM
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE
            REFERENCED_TABLE_SCHEMA = DATABASE()
            AND REFERENCED_TABLE_NAME IS NOT NULL;
        `;
        
        const result = await ConnectionsService.executeQuery(db, query);
        return result;
      }
      
      // For other database types, return empty array
      return [];
    } catch (error) {
      schemaLogger.error(`Error fetching relationships for database ${dbId}: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Cache unified schema to Redis for quick access
   */
  static async cacheUnifiedSchema(userId: number, dbId: number, schema: UnifiedSchema): Promise<boolean> {
    try {
      const { getRedisClient } = await import("../../../config/redis");
      const redisClient = await getRedisClient();
      
      const key = `schema:unified:${userId}:${dbId}`;
      await redisClient.set(key, JSON.stringify(schema), 'EX', 3600); // 1 hour expiry
      
      return true;
    } catch (error) {
      schemaLogger.warn(`Failed to cache unified schema: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Get cached unified schema from Redis
   */
  static async getCachedUnifiedSchema(userId: number, dbId: number): Promise<UnifiedSchema | null> {
    try {
      const { getRedisClient } = await import("../../../config/redis");
      const redisClient = await getRedisClient();
      
      const key = `schema:unified:${userId}:${dbId}`;
      const cachedSchema = await redisClient.get(key);
      
      if (!cachedSchema) return null;
      
      return JSON.parse(cachedSchema) as UnifiedSchema;
    } catch (error) {
      schemaLogger.warn(`Failed to get cached unified schema: ${(error as Error).message}`);
      return null;
    }
  }
}

export default SchemaService;