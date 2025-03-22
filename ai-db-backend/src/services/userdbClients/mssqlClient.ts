import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../models/userDatabase.model";
import sql from "mssql";

function getConfig(db: UserDatabase): sql.config {
  if (!db.host || !db.port || !db.username || !db.encrypted_password || !db.database_name) {
    throw new Error("❌ Missing MSSQL connection fields.");
  }

  return {
    user: db.username,
    password: db.encrypted_password,
    server: db.host,
    port: db.port,
    database: db.database_name,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };
}

export const mssqlClient: IDatabaseClient = {
  async connect(db: UserDatabase) {},

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const pool = await sql.connect(getConfig(db));
    const result = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    await pool.close();
    return result.recordset.map((r: any) => r.TABLE_NAME);
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const pool = await sql.connect(getConfig(db));
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = '${table}'
    `);
    await pool.close();
    return result.recordset;
  },

  async runQuery(db: UserDatabase, query: string): Promise<any> {
    const pool = await sql.connect(getConfig(db));
    const result = await pool.request().query(query);
    await pool.close();
    return result.recordset;
  }
};
