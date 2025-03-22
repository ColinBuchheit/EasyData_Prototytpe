// src/models/queryContext.model.ts
export interface QueryContext {
    id: number;
    user_id: number;
    db_id: number;
    is_current: boolean;
    last_used: Date;
    switch_count: number;
    created_at: Date;
  }