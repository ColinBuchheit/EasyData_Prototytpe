export interface Analytics {
    id: number;
    user_id?: number | null; // ✅ Nullable for system-wide metrics
    query_count: number;
    avg_response_time_ms: number;
    agent_performance: Record<string, number>; // ✅ Tracks processing times per agent
    most_common_queries?: string[];
    session_count?: number;
    security_flags?: number; // ✅ Number of flagged security issues
    created_at: Date | string;
    updated_at?: Date | string;
  }
  