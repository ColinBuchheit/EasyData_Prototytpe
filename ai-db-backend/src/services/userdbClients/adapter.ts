import { IDatabaseClient } from "./interfaces";
import { postgresClient } from "./postgresClient";
import { mysqlClient } from "./mysqlClient";
import { mssqlClient } from "./mssqlClient";
import { sqliteClient } from "./sqliteClient";
import { mongodbClient } from "./mongodbClient";
import { firebaseClient } from "./firebaseClient";
import { couchdbClient } from "./couchdbClient";
import { dynamodbClient } from "./dynamodbClient";

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
      throw new Error(`❌ Unsupported database type: ${dbType}`);
  }
}
