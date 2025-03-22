import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../models/userDatabase.model";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

export const sqliteClient: IDatabaseClient = {
  async connect(db: UserDatabase) {},

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const dbPath = db.host; // expected to store file path in `host`
    const connection = await open({ filename: dbPath!, driver: sqlite3.Database });
    const rows = await connection.all(`SELECT name FROM sqlite_master WHERE type='table'`);
    await connection.close();
    return rows.map(row => row.name);
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const dbPath = db.host;
    const connection = await open({ filename: dbPath!, driver: sqlite3.Database });
    const rows = await connection.all(`PRAGMA table_info(${table})`);
    await connection.close();
    return rows;
  },

  async runQuery(db: UserDatabase, query: string): Promise<any> {
    const dbPath = db.host;
    const connection = await open({ filename: dbPath!, driver: sqlite3.Database });
    const rows = await connection.all(query);
    await connection.close();
    return rows;
  }
};
