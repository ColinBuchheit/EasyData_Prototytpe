import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../models/userDatabase.model";
import mysql from "mysql2/promise";

function getConnectionConfig(db: UserDatabase): mysql.ConnectionOptions {
  if (!db.host || !db.port || !db.username || !db.encrypted_password || !db.database_name) {
    throw new Error("❌ Missing MySQL connection fields.");
  }

  return {
    host: db.host,
    port: db.port,
    user: db.username,
    password: db.encrypted_password,
    database: db.database_name,
  };
}

export const mysqlClient: IDatabaseClient = {
  async connect(db: UserDatabase) {},

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const connection = await mysql.createConnection(getConnectionConfig(db));
    const [rawRows] = await connection.query("SHOW TABLES");

    // 🛠️ Type-safe casting to resolve TS7053
    const rows = rawRows as Record<string, any>[];
    const tableKey = Object.keys(rows[0])[0]; // e.g., "Tables_in_mydb"

    await connection.end();
    return rows.map(row => row[tableKey]);
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const connection = await mysql.createConnection(getConnectionConfig(db));
    const [rows] = await connection.query(`DESCRIBE \`${table}\``);
    await connection.end();
    return rows;
  },

  async runQuery(db: UserDatabase, query: string): Promise<any> {
    const connection = await mysql.createConnection(getConnectionConfig(db));
    const [rows] = await connection.query(query);
    await connection.end();
    return rows;
  }
};
