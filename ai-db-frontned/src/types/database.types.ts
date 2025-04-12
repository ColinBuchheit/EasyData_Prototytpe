// src/types/database.types.ts
export type DatabaseType = 
  | 'postgres' 
  | 'mysql' 
  | 'mssql' 
  | 'sqlite' 
  | 'mongodb' 
  | 'firebase' 
  | 'couchdb' 
  | 'dynamodb';

export interface DbConnectionRequest {
  dbType: DatabaseType;
  host: string;
  port: number;
  username: string;
  password: string;
  dbName: string;
  connectionName?: string;
}

export interface DbConnection {
  id: number;
  user_id: number;
  connection_name?: string;
  db_type: DatabaseType;
  host?: string;
  port?: number;
  username?: string;
  database_name: string;
  is_connected: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  error?: string;
}

// Other interfaces remain unchanged
export interface ConnectionHealthStatus {
  id: number;
  dbName: string;
  dbType: DatabaseType;
  isHealthy: boolean;
  latencyMs: number;
  message: string;
  lastChecked: string;
}

export interface DatabaseField {
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

export interface DatabaseTable {
  name: string;
  description?: string;
  columns: DatabaseField[];
  primaryKey?: string | string[];
  estimatedRows?: number;
}

export interface DbSchema {
  id: number;
  name: string;
  type: string;
  tables: DatabaseTable[];
  relationships?: DbRelationship[];
  metadata?: {
    domainType?: string;
    contentDescription?: string;
    dataCategory?: string[];
    lastAnalyzed?: Date;
  };
}

export interface DbRelationship {
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

export interface DbMetadata {
  userId: number;
  dbId: number;
  dbType: DatabaseType;
  dbName: string;
  tables: {
    name: string;
    purpose: string;
    fields: {
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
    }[];
    exampleQueries: string[];
  }[];
  domainType: string;
  contentDescription: string;
  dataCategory: string[];
  updatedAt: string;
}

export interface DatabaseState {
  connections: DbConnection[];
  selectedConnection: DbConnection | null;
  schema: DbSchema | null;
  metadata: DbMetadata | null;
  healthStatus: Record<number, ConnectionHealthStatus>;
  loading: boolean;
  error: string | null;
}