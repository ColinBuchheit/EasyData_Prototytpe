// src/models/databaseMetadata.model.ts
export interface DatabaseField {
    name: string;
    type: string;
    description: string;
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