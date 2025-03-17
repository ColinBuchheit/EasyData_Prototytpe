// src/models/userSchema.model.ts
export interface UserSchema {
  id: number;
  user_database_id: number;
  table_name: string;
  column_name: string;
  data_type: string;
  constraints?: string | null; // ✅ Explicitly allows null
  default_value?: string | number | null; // ✅ Tracks default values
  is_primary_key?: boolean; // ✅ Indicates if column is a primary key
  last_updated: Date | string; // ✅ Allows Date or string for serialization
  foreign_key_reference?: string | null; // ✅ Tracks foreign key relationships (table.column)
  is_indexed?: boolean; // ✅ Indicates if column is indexed for faster lookups
  is_auto_increment?: boolean; // ✅ Tracks auto-increment columns
}
