// src/modules/database/models/unified-schema.model.ts

import { DatabaseMetadata } from "./schema.model";

/**
 * Unified schema representation for consistent cross-database schema handling
 * This format standardizes schema information across different database types
 */
export interface UnifiedSchema {
  // Basic database identification
  id: number;
  name: string;
  type: string;
  
  // Tables and their structures
  tables: UnifiedTable[];
  
  // Relationships between tables (if available)
  relationships?: UnifiedRelationship[];
  
  // Metadata about the database (domain, purpose, etc.)
  metadata?: {
    domainType?: string;
    contentDescription?: string;
    dataCategory?: string[];
    lastAnalyzed?: Date;
  };
}

/**
 * Unified table representation
 */
export interface UnifiedTable {
  name: string;
  description?: string;
  columns: UnifiedColumn[];
  primaryKey?: string | string[];
  estimatedRows?: number;
}

/**
 * Unified column representation
 */
export interface UnifiedColumn {
  name: string;
  type: string;
  description?: string;
  nullable: boolean;
  isPrimary?: boolean;
  isForeign?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

/**
 * Unified relationship representation
 */
export interface UnifiedRelationship {
  name?: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  source: {
    table: string;
    column: string;
  };
  target: {
    table: string;
    column: string;
  };
}

/**
 * Convert database-specific schema to unified format
 */
export function convertToUnifiedSchema(
  dbId: number,
  dbName: string,
  dbType: string,
  tables: string[],
  columnsMap: Record<string, any[]>,
  metadata?: DatabaseMetadata | null
): UnifiedSchema {
  const unifiedTables: UnifiedTable[] = [];
  
  // Process each table
  for (const tableName of tables) {
    const columns = columnsMap[tableName] || [];
    const unifiedColumns: UnifiedColumn[] = [];
    
    // Convert columns to unified format
    for (const column of columns) {
      // Handle different database-specific column formats
      let columnName = '';
      let columnType = '';
      let nullable = true;
      
      if (typeof column === 'object') {
        // PostgreSQL format
        if ('column_name' in column) {
          columnName = column.column_name;
          columnType = column.data_type;
          nullable = column.is_nullable === 'YES';
        } 
        // MySQL format
        else if ('Field' in column) {
          columnName = column.Field;
          columnType = column.Type;
          nullable = column.Null === 'YES';
        } 
        // MongoDB format
        else if ('name' in column) {
          columnName = column.name;
          columnType = column.type || typeof column.sample;
          nullable = true; // MongoDB is schemaless
        }
        // Generic format
        else if (column.name) {
          columnName = column.name;
          columnType = column.type || 'unknown';
          nullable = column.nullable !== false;
        }
      } else if (Array.isArray(column)) {
        // Handle array format
        columnName = column[0] || '';
        columnType = column[1] || '';
        nullable = true;
      }
      
      if (columnName) {
        unifiedColumns.push({
          name: columnName,
          type: columnType || 'unknown',
          nullable,
          isPrimary: column.primaryKey || column.isPrimary || false,
          isForeign: column.isForeign || false
        });
      }
    }
    
    // Find table description from metadata if available
    let tableDescription = '';
    if (metadata?.tables) {
      const metadataTable = metadata.tables.find(t => t.name === tableName);
      if (metadataTable) {
        tableDescription = metadataTable.purpose || '';
      }
    }
    
    unifiedTables.push({
      name: tableName,
      description: tableDescription,
      columns: unifiedColumns
    });
  }
  
  // Create the unified schema
  const unifiedSchema: UnifiedSchema = {
    id: dbId,
    name: dbName,
    type: dbType,
    tables: unifiedTables
  };
  
  // Add metadata if available
  if (metadata) {
    unifiedSchema.metadata = {
      domainType: metadata.domainType,
      contentDescription: metadata.contentDescription,
      dataCategory: metadata.dataCategory,
      lastAnalyzed: metadata.updatedAt
    };
  }
  
  return unifiedSchema;
}