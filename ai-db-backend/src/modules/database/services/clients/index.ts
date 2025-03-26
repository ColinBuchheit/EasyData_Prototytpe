// src/modules/database/services/clients/index.ts

import { IDatabaseClient } from "./interfaces";
import { postgresClient } from "./postgresClient";
import { mysqlClient } from "./mysqlClient";
import { mssqlClient } from "./mssqlClient";
import { sqliteClient } from "./sqliteClient";
import { mongodbClient } from "./mongodbClient";
import { firebaseClient } from "./firebaseClient";
import { couchdbClient } from "./couchdbClient";
import { dynamodbClient } from "./dynamodbClient";
import { createContextLogger } from "../../../../config/logger";
import { UserDatabase } from "../../models/connection.model";
import { DatabaseType } from "../../models/database-types.model";

const dbLogger = createContextLogger("DatabaseClients");

// Cache connections for reuse
export const connectionCache: Record<string, any> = {};

// Generate a unique connection key
export function getConnectionKey(db: UserDatabase): string {
  return `${db.db_type}:${db.user_id}:${db.id}`;
}

export function getClientForDB(dbType: DatabaseType): IDatabaseClient {
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
      dbLogger.error(`Unsupported database type: ${dbType}`);
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}

export function clearConnectionCache() {
  Object.keys(connectionCache).forEach(key => {
    delete connectionCache[key];
  });
  dbLogger.info("Connection cache cleared");
}

// Export clients for direct access
export {
  postgresClient,
  mysqlClient,
  mssqlClient,
  sqliteClient,
  mongodbClient,
  firebaseClient,
  couchdbClient,
  dynamodbClient
};