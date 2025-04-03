// src/modules/database/models/database-types.model.ts

export type DatabaseType = "postgres" | "mysql" | "mssql" | "sqlite" | "mongodb" | "firebase" | "couchdb" | "dynamodb";

export const isValidDatabaseType = (type: string): type is DatabaseType => {
  return ["postgres", "mysql", "mssql", "sqlite", "mongodb", "firebase", "couchdb", "dynamodb"].includes(type);
};

export const DATABASE_TYPE_LABELS: Record<DatabaseType, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  mssql: "MS SQL Server",
  sqlite: "SQLite",
  mongodb: "MongoDB",
  firebase: "Firebase",
  couchdb: "CouchDB",
  dynamodb: "DynamoDB"
};