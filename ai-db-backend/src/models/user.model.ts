export interface User {
  id: number;
  username: string;
  email?: string | null;
  password_hash: string;
  password_salt?: string;
  role: "admin" | "user" | "read-only";
  is_active: boolean;
  two_factor_enabled?: boolean; // ✅ Tracks whether 2FA is enabled
  created_at: Date | string;
  updated_at?: Date | string;
  last_login?: Date | string;
}
