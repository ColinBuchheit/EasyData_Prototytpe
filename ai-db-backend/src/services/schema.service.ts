import { pool } from "../config/db";
import logger from "../config/logger";

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
