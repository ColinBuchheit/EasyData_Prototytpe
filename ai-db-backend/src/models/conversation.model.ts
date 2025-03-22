// src/models/conversation.model.ts
export interface Conversation {
  _id?: string;
  userId: number;
  dbId?: number | null;
  userMessage: string;
  response?: string | null;
  agentsInvolved: string[];
  processingStatus: "pending" | "in_progress" | "completed" | "error";
  errorLog?: string | null;
  executionTimeMs?: number | null;
  timestamp: Date;
  metadata?: Record<string, any> | null;
}