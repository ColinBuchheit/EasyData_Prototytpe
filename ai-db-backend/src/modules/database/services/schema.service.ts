// src/modules/database/services/schema.service.ts

import { pool } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { getMongoClient } from "../../../config/db";
import axios from "axios";
import { ConnectionsService } from "./connections.service";
import { DatabaseMetadata, SchemaValidationResult } from "../models/schema.model";
import { DatabaseType } from "../models/database.types.model";

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
      for (const table of tables) {
        const columns = await ConnectionsService.fetchSchemaFromConnection(db, table);
        schemaDetails.push({
          table,
          columns
        });
      }
      
      // Ask AI to analyze the schema
      const aiResponse = await axios.post("http://ai-agent-network:5001/run", {
        operation: "analyze_schema",
        userId,
        dbId,
        dbType: db.db_type,
        dbName: db.database_name,
        schemaDetails
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
}

export default SchemaService;