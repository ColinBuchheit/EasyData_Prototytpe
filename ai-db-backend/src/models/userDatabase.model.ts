export interface UserDatabase {
  id: number;
  user_id: number;
  connection_name?: string;
  db_type: "postgres" | "mysql" | "mssql" | "sqlite" | "mongodb" | "firebase" | "couchdb" | "dynamodb";
  host?: string | null;
  port?: number | null;
  username?: string | null;
  encrypted_password?: string | null;
  encryption_method?: "AES-256" | "bcrypt" | "plaintext"; // ✅ Tracks encryption method
  database_name: string;
  created_at: Date | string;
  updated_at?: Date | string;
  is_connected: boolean;
}
