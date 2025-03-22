import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../models/userDatabase.model";
import { MongoClient } from "mongodb";

export const mongodbClient: IDatabaseClient = {
  async connect(db: UserDatabase) {},

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const uri = `mongodb://${db.username}:${db.encrypted_password}@${db.host}:${db.port}`;
    const client = new MongoClient(uri);
    await client.connect();
    const dbInstance = client.db(db.database_name);
    const collections = await dbInstance.listCollections().toArray();
    await client.close();
    return collections.map(col => col.name);
  },

  async fetchSchema(db: UserDatabase, collection: string): Promise<any> {
    const uri = `mongodb://${db.username}:${db.encrypted_password}@${db.host}:${db.port}`;
    const client = new MongoClient(uri);
    await client.connect();
    const dbInstance = client.db(db.database_name);
    const doc = await dbInstance.collection(collection).findOne();
    await client.close();
    return doc ? Object.keys(doc) : [];
  },

  async runQuery(db: UserDatabase, query: any): Promise<any> {
    const uri = `mongodb://${db.username}:${db.encrypted_password}@${db.host}:${db.port}`;
    const client = new MongoClient(uri);
    await client.connect();
    const dbInstance = client.db(db.database_name);
    const result = await dbInstance.collection(query.collection).find(query.filter || {}).toArray();
    await client.close();
    return result;
  }
};
