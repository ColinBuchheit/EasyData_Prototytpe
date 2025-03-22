// src/models/user.model.ts
export interface User {
  id: number;
  username: string;
  email: string | null;
  password_hash: string;
  password_salt?: string | null;
  role: "admin" | "user" | "read-only";
  is_active: boolean;
  two_factor_enabled: boolean;
  created_at: Date;
  updated_at: Date;
  last_login?: Date | null;
}