import { pool } from "../config/db";
import logger from "../config/logger";
import { getMongoClient } from "../config/db";
import axios from "axios";
import { fetchDatabaseById } from "./userdb.service";



interface SchemaMetadata {
  dbId: number;
  userId: number;
  dbType: string;
  dbName: string;
  tables: {
    name: string;
    purpose: string;
    fields: {
      name: string;
      type: string;
      description: string;
    }[];
    exampleQueries: string[];
  }[];
  domainType: string;
  contentDescription: string;
  dataCategory: string[];
  updatedAt: Date;
}
/**
 * ✅ Fetch all tables from the user's connected database.
 */
export const fetchAllTables = async (dbType: string): Promise<string[]> => {
  try {
    let query = "";
    
    if (dbType === "postgres") {
      query = "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';";
    } else if (dbType === "mysql") {
      query = "SHOW TABLES;";
    } else {
      throw new Error("❌ Unsupported database type.");
    }

    const result = await pool.query(query);
    return result.rows.map((row: Record<string, string>) => Object.values(row)[0] as string); // ✅ Ensures `string[]`

  } catch (error) {
    logger.error(`❌ Error fetching tables: ${(error as Error).message}`);
    throw new Error("Failed to fetch tables.");
  }
};

/**
 * ✅ Fetch schema details for a specific table (column names, data types, constraints).
 */
export const fetchTableSchema = async (dbType: string, tableName: string): Promise<any[]> => {
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
      throw new Error("❌ Unsupported database type.");
    }

    const result = await pool.query(query, dbType === "postgres" ? [tableName] : []);
    return result.rows;
  } catch (error) {
    logger.error(`❌ Error fetching schema for table ${tableName}: ${(error as Error).message}`);
    throw new Error("Failed to fetch table schema.");
  }
};

/**
 * ✅ Validate a query against the database schema to prevent invalid queries.
 */
export const validateQueryAgainstSchema = async (query: string, dbType: string): Promise<boolean> => {
  try {
    const schemaTables = await fetchAllTables(dbType);

    // ✅ Extract tables from the query
    const queryTables = extractTablesFromQuery(query);
    
    // ✅ Ensure all tables in the query exist in the schema
    const isValidTableUsage = queryTables.every(table => schemaTables.includes(table));
    const isSelectOnly = query.trim().toUpperCase().startsWith("SELECT");

    if (!isValidTableUsage) {
      logger.warn(`❌ Query validation failed. Unknown tables: ${queryTables.filter(table => !schemaTables.includes(table))}`);
      return false;
    }

    if (!isSelectOnly) {
      logger.warn("❌ Query validation failed: Non-SELECT operations are not allowed.");
      return false;
    }

    return true;
  } catch (error) {
    logger.error(`❌ Query Schema Validation Failed: ${(error as Error).message}`);
    return false;
  }
};

/**
 * ✅ Extract table names from a SQL query.
 */
const extractTablesFromQuery = (query: string): string[] => {
  const regex = /FROM\s+(\w+)|JOIN\s+(\w+)/gi;
  const tables: string[] = [];
  let match;

  while ((match = regex.exec(query)) !== null) {
    tables.push(match[1] || match[2]);
  }

  return tables;
};

export const analyzeAndStoreDbSchema = async (userId: number, dbId: number): Promise<SchemaMetadata | null> => {
  try {
    // Fetch database details
    const db = await fetchDatabaseById(userId, dbId);
    if (!db) return null;
    
    // Get all tables
    const tables = await fetchAllTables(db.db_type);
    if (!tables.length) return null;
    
    // Create schema structure to analyze
    const schemaDetails = [];
    for (const table of tables) {
      const columns = await fetchTableSchema(db.db_type, table);
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
      logger.error(`❌ AI schema analysis failed for database ${dbId}`);
      return null;
    }
    
    const metadata: SchemaMetadata = {
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
    
    logger.info(`✅ Database schema analyzed and metadata stored for DB ${dbId}`);
    return metadata;
    
  } catch (error) {
    logger.error(`❌ Error analyzing database schema: ${(error as Error).message}`);
    return null;
  }
};

// Add function to retrieve schema metadata
export const getDbMetadata = async (userId: number, dbId: number): Promise<SchemaMetadata | null> => {
  try {
    const client = await getMongoClient();
    const document = await client.db().collection('database_metadata')
      .findOne({ dbId, userId });
    
    if (!document) return null;
    
    // Properly convert MongoDB document to SchemaMetadata
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
    } as SchemaMetadata;
  } catch (error) {
    logger.error(`❌ Error retrieving database metadata: ${(error as Error).message}`);
    return null;
  }
};

export const getAllDbMetadata = async (userId: number): Promise<SchemaMetadata[]> => {
  try {
    const client = await getMongoClient();
    const documents = await client.db().collection('database_metadata')
      .find({ userId })
      .toArray();
    
    // Explicitly map MongoDB documents to SchemaMetadata array
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
    } as SchemaMetadata));
  } catch (error) {
    logger.error(`❌ Error retrieving all database metadata: ${(error as Error).message}`);
    return [];
  }
};
