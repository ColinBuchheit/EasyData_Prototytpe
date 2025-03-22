// src/models/agentLog.model.ts
export interface AgentLog {
    id: number;
    user_id?: number | null;
    query_id?: number | null;
    agent_name: string;
    processing_time_ms?: number | null;
    security_flag: boolean;
    log_data?: Record<string, any> | null;
    timestamp: Date;
  }