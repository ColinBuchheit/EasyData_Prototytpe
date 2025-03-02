// src/models/userSchema.model.ts
export interface UserSchema {
    id: number;
    user_database_id: number;
    table_name: string;
    column_name: string;
    data_type: string;
    constraints?: string; // Nullable
    last_updated: Date;
  }
  