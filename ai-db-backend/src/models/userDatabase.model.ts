export interface UserDatabase {
  id: number;
  user_id: number;
  connection_name?: string | null;
  db_type: "postgres" | "mysql" | "mssql" | "sqlite" | "mongodb" | "firebase" | "couchdb" | "dynamodb";
  host?: string | null;
  port?: number | null;
  username?: string | null;
  encrypted_password?: string | null;
  encryption_method?: "AES-256" | "bcrypt" | "plaintext";
  database_name: string;
  is_connected: boolean;
  created_at: Date;
  updated_at?: Date;
}