// src/models/user.model.ts
export interface User {
  id: number;
  username: string;
  email?: string | null; // ✅ Allows `null` for accounts without an email
  password_hash: string;
  password_salt?: string; // ✅ Ensures salted password hashing
  role: "admin" | "user" | "read-only";
  is_active: boolean; // ✅ Tracks account status
  created_at: Date | string; // ✅ Allows Date or string for serialization
  updated_at?: Date | string; // ✅ Tracks last update
  last_login?: Date | string; // ✅ Tracks last successful login

}
