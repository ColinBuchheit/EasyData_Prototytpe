// src/models/userDatabase.model.ts
export interface UserDatabase {
    id: number;
    user_id: number;
    db_type: "postgres" | "mysql" | "mssql" | "sqlite";
    host: string;
    port: number;
    username: string;
    encrypted_password: string; // Stored securely
    database_name: string;
    created_at: Date;
  }
  