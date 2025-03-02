// src/models/conversation.model.ts
export interface Conversation {
    id: number;
    user_id: number;
    agent_name: string;
    message: string;
    response: string;
    timestamp: Date;
  }
  