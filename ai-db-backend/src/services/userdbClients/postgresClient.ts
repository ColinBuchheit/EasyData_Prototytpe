import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../models/userDatabase.model";
import { Client } from "pg";

function getClient(db: UserDatabase): Client {
  if (!db.host || !db.port || !db.username || !db.encrypted_password || !db.database_name) {
    throw new Error("❌ Missing PostgreSQL connection fields.");
  }

  return new Client({
    host: db.host,
    port: db.port,
    user: db.username,
    password: db.encrypted_password,
    database: db.database_name,
  });
}

export const postgresClient: IDatabaseClient = {
  async connect(db: UserDatabase) {},

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const client = getClient(db);
    await client.connect();
    const res = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    await client.end();
    return res.rows.map(row => row.table_name);
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const client = getClient(db);
    await client.connect();
    const res = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
      [table]
    );
    await client.end();
    return res.rows;
  },

  async runQuery(db: UserDatabase, query: string): Promise<any> {
    const client = getClient(db);
    await client.connect();
    const res = await client.query(query);
    await client.end();
    return res.rows;
  }
};
