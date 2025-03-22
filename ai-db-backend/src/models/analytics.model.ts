// src/models/analytics.model.ts
export interface Analytics {
  id: number;
  user_id?: number | null;
  query_count: number;
  avg_response_time_ms: number;
  agent_performance: Record<string, number>;
  security_flags?: number;
  created_at: Date;
  updated_at: Date;
}