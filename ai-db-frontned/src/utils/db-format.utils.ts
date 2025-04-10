// src/utils/db-format.utils.ts
import { DbConnection, DatabaseType } from '../types/database.types';

/**
 * Format a database connection as a connection string
 */
export const formatConnectionString = (connection: DbConnection): string => {
  const { db_type, host, port, username, database_name } = connection;
  
  // Add password placeholder for better security
  const passwordPlaceholder = '********';
  
  switch (db_type) {
    case 'postgres':
      return `postgresql://${username}:${passwordPlaceholder}@${host}:${port}/${database_name}`;
      
    case 'mysql':
      return `mysql://${username}:${passwordPlaceholder}@${host}:${port}/${database_name}`;
      
    case 'mssql':
      return `mssql://${username}:${passwordPlaceholder}@${host}:${port}/${database_name}`;
      
    case 'sqlite':
      return `sqlite:///${database_name}`;
      
    case 'mongodb':
      return `mongodb://${username}:${passwordPlaceholder}@${host}:${port}/${database_name}`;
      
    case 'firebase':
      return `https://${database_name}.firebaseio.com`;
      
    case 'couchdb':
      return `http://${username}:${passwordPlaceholder}@${host}:${port}/${database_name}`;
      
    case 'dynamodb':
      // Using a default region since we don't have a region property
      const defaultRegion = 'us-east-1';
      return `dynamodb://${defaultRegion}/${database_name}`;
      
    default:
      return `${db_type}://${username}:${passwordPlaceholder}@${host}:${port}/${database_name}`;
  }
};

/**
 * Get a human-readable name for a database type
 */
export const getDatabaseTypeName = (type: DatabaseType): string => {
  switch (type) {
    case 'postgres':
      return 'PostgreSQL';
    case 'mysql':
      return 'MySQL';
    case 'mssql':
      return 'Microsoft SQL Server';
    case 'sqlite':
      return 'SQLite';
    case 'mongodb':
      return 'MongoDB';
    case 'firebase':
      return 'Firebase';
    case 'couchdb':
      return 'CouchDB';
    case 'dynamodb':
      return 'DynamoDB';
    default:
      return type;
  }
};

/**
 * Get a color for a database type
 */
export const getDatabaseTypeColor = (type: DatabaseType): string => {
  switch (type) {
    case 'postgres':
      return 'text-blue-400';
    case 'mysql':
      return 'text-orange-400';
    case 'mssql':
      return 'text-blue-500';
    case 'sqlite':
      return 'text-green-400';
    case 'mongodb':
      return 'text-green-500';
    case 'firebase':
      return 'text-amber-500';
    case 'couchdb':
      return 'text-red-400';
    case 'dynamodb':
      return 'text-yellow-400';
    default:
      return 'text-zinc-400';
  }
};

// DynamoDB connection string helper with region parameter
export const getDynamoDbConnectionString = (
  connection: DbConnection, 
  region: string = 'us-east-1'
): string => {
  return `dynamodb://${region}/${connection.database_name}`;
};