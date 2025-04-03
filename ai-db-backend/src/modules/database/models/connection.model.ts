// src/modules/database/models/connection.model.ts

import { DatabaseType } from "./database.types.model";

export interface UserDatabase {
  id: number;
  user_id: number;
  connection_name?: string | null;
  db_type: DatabaseType;
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

export interface DatabaseConnectionConfig {
  dbType: DatabaseType;
  host: string;
  port: number;
  username: string;
  password: string;
  dbName: string;
  connectionName?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  error?: string;
}