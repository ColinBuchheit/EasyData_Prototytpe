// src/services/userdbClients/adapter.ts
import { IDatabaseClient } from "./interfaces";
import { postgresClient } from "./postgresClient";
import { mysqlClient } from "./mysqlClient";
import { mssqlClient } from "./mssqlClient";
import { sqliteClient } from "./sqliteClient";
import { mongodbClient } from "./mongodbClient";
import { firebaseClient } from "./firebaseClient";
import { couchdbClient } from "./couchdbClient";
import { dynamodbClient } from "./dynamodbClient";
import logger from "../../../../config/logger";
import { UserDatabase } from "../../models/connection.model";

// Cache connections for reuse
export const connectionCache: Record<string, any> = {};

// Generate a unique connection key
export function getConnectionKey(db: UserDatabase): string {
  return `${db.db_type}:${db.user_id}:${db.id}`;
}

export function getClientForDB(dbType: string): IDatabaseClient {
  switch (dbType) {
    case "postgres":
      return postgresClient;
    case "mysql":
      return mysqlClient;
    case "mssql":
      return mssqlClient;
    case "sqlite":
      return sqliteClient;
    case "mongodb":
      return mongodbClient;
    case "firebase":
      return firebaseClient;
    case "couchdb":
      return couchdbClient;
    case "dynamodb":
      return dynamodbClient;
    default:
      logger.error(`❌ Unsupported database type: ${dbType}`);
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}