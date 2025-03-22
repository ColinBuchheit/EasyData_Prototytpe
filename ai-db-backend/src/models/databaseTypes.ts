// src/models/databaseTypes.ts
export type DatabaseType = "postgres" | "mysql" | "mssql" | "sqlite" | "mongodb" | "firebase" | "couchdb" | "dynamodb";

export const isValidDatabaseType = (type: string): type is DatabaseType => {
  return ["postgres", "mysql", "mssql", "sqlite", "mongodb", "firebase", "couchdb", "dynamodb"].includes(type);
};