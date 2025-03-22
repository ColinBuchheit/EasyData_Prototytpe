// src/models/multiDbQuery.model.ts
export interface MultiDbQuery {
    id: number;
    user_id: number;
    query: string;
    databases_involved: number[];
    execution_time_ms?: number | null;
    timestamp: Date;
  }