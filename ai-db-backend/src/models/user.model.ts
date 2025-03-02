// src/models/user.model.ts
export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: "admin" | "user" | "read-only";
  created_at: Date;
}
