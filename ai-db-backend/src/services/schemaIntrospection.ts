import { Pool as PostgresPool } from "pg";
import mysql from "mysql2/promise";
import sql from "mssql";
import { Database as SQLiteDatabase } from "sqlite";
import { MongoClient } from "mongodb";
import admin from "firebase-admin";
import nano from "nano";
import AWS from "aws-sdk";
import logger from "../config/logger";

/**
 * ✅ Fetches MongoDB schema metadata.
 */
export const getMongoSchema = async (client: MongoClient) => {
  try {
    if (!client) throw new Error("❌ No active MongoDB connection.");

    const db = client.db();
    const collections = await db.listCollections().toArray();

    if (!collections.length) {
      logger.warn("⚠️ MongoDB schema is empty.");
      return {};
    }

    const schema = collections.map(coll => ({ collection: coll.name }));
    logger.info("✅ MongoDB schema introspection completed.");
    return schema;
  } catch (error) {
    logger.error(`❌ Error retrieving MongoDB schema: ${(error as Error).message}`);
    throw error;
  }
};

/**
 * ✅ Fetches Firebase Firestore schema metadata.
 */
export const getFirebaseSchema = async () => {
  try {
    if (!admin.apps.length) throw new Error("❌ Firebase Admin SDK not initialized.");

    const firestore = admin.firestore();
    const collections = await firestore.listCollections();

    if (!collections.length) {
      logger.warn("⚠️ Firebase schema is empty.");
      return {};
    }

    const schema = collections.map((coll: FirebaseFirestore.CollectionReference) => ({ collection: coll.id })); // ✅ Now typed
    logger.info("✅ Firebase schema introspection completed.");
    return schema;
  } catch (error) {
    logger.error(`❌ Error retrieving Firebase schema: ${(error as Error).message}`);
    throw error;
  }
};

/**
 * ✅ Fetches CouchDB schema metadata.
 */
export const getCouchDBSchema = async (couch: any) => {
  try {
    if (!couch) throw new Error("❌ No active CouchDB connection.");

    const databases = await couch.db.list();
    if (!databases.length) {
      logger.warn("⚠️ CouchDB schema is empty.");
      return {};
    }

    const schema = databases.map((db: string) => ({ database: db })); // ✅ Now explicitly typed
    logger.info("✅ CouchDB schema introspection completed.");
    return schema;
  } catch (error) {
    logger.error(`❌ Error retrieving CouchDB schema: ${(error as Error).message}`);
    throw error;
  }
};

/**
 * ✅ Fetches DynamoDB schema metadata.
 */
export const getDynamoDBSchema = async () => {
  try {
    const dynamoDB = new AWS.DynamoDB();
    const tables = await dynamoDB.listTables().promise();

    if (!tables.TableNames || !tables.TableNames.length) {
      logger.warn("⚠️ DynamoDB schema is empty.");
      return {};
    }

    const schema = tables.TableNames.map(table => ({ table }));
    logger.info("✅ DynamoDB schema introspection completed.");
    return schema;
  } catch (error) {
    logger.error(`❌ Error retrieving DynamoDB schema: ${(error as Error).message}`);
    throw error;
  }
};
