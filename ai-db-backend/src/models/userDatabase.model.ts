// src/models/userDatabase.model.ts
export interface UserDatabase {
  id: number;
  user_id: number;
  connection_name?: string; // ✅ User-friendly name for database connection
  db_type: "postgres" | "mysql" | "mssql" | "sqlite" | "mongodb" | "firebase" | "couchdb" | "dynamodb";
  host?: string | null; // ✅ SQLite does not need a host
  port?: number | null; // ✅ Some DBs do not require a port
  username?: string | null; // ✅ Some DBs do not require authentication
  encrypted_password?: string | null; // ✅ Supports DBs without passwords
  database_name: string;
  created_at: Date | string; // ✅ Allows Date or string for serialization
  updated_at?: Date | string; // ✅ Tracks last update
  is_connected: boolean; // ✅ Tracks if the database is currently connected

}
