// src/modules/database/models/schema.model.ts

export interface DatabaseField {
    name: string;
    type: string;
    description: string;
    nullable?: boolean;
    isPrimary?: boolean;
    isForeign?: boolean;
    references?: {
      table: string;
      column: string;
    };
  }
  
  export interface DatabaseTable {
    name: string;
    purpose: string;
    fields: DatabaseField[];
    exampleQueries: string[];
  }
  
  export interface DatabaseMetadata {
    _id?: string;
    userId: number;
    dbId: number;
    dbType: string;
    dbName: string;
    tables: DatabaseTable[];
    domainType: string;
    contentDescription: string;
    dataCategory: string[];
    updatedAt: Date;
  }
  
  export interface SchemaValidationResult {
    isValid: boolean;
    message?: string;
    invalidTables?: string[];
  }