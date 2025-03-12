// src/models/aiQuery.model.ts
export interface AIQuery {
  id: number;
  user_id: number;
  query_text: string;
  execution_status: "pending" | "running" | "completed" | "failed";
  result?: object | null; // ✅ Explicitly allows null
  error_log?: string | null; // ✅ Explicitly allows null
  created_at: Date | string; // ✅ Allows Date or string for serialization
  duration_ms?: number | null; // ✅ Tracks execution duration in milliseconds

}
