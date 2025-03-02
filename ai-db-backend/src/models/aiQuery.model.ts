// src/models/aiQuery.model.ts
export interface AIQuery {
    id: number;
    user_id: number;
    query_text: string;
    execution_status: "pending" | "running" | "completed" | "failed";
    result?: object; // Nullable JSON
    error_log?: string; // Nullable
    created_at: Date;
  }
  