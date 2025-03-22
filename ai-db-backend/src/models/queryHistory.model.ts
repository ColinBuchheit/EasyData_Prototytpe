// src/models/queryHistory.model.ts
export interface QueryHistory {
    id: number;
    user_id: number;
    db_id: number;
    query: string;
    execution_time_ms?: number | null;
    row_count?: number | null;
    timestamp: Date;
  }