import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../models/userDatabase.model";
import nano from "nano";

export const couchdbClient: IDatabaseClient = {
  async connect(db: UserDatabase) {
    // Nothing to persist; nano handles this per-call
  },

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const couch = nano(`http://${db.username}:${db.encrypted_password}@${db.host}:${db.port}`);
    const databases = await couch.db.list();
    return databases;
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const couch = nano(`http://${db.username}:${db.encrypted_password}@${db.host}:${db.port}`);
    const dbInstance = couch.use(table);
    const result = await dbInstance.find({ selector: {}, limit: 1 });
    return result.docs.length ? Object.keys(result.docs[0]) : [];
  },

  async runQuery(db: UserDatabase, query: any): Promise<any> {
    const couch = nano(`http://${db.username}:${db.encrypted_password}@${db.host}:${db.port}`);
    const dbInstance = couch.use(query.collection || query.table);
    return await dbInstance.find(query.selector || {});
  }
};
