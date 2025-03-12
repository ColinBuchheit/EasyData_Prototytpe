// src/models/conversation.model.ts
export interface Conversation {
  id: number;
  user_id: number;
  agent_name: string;
  message_id: string; // ✅ Unique message tracking
  message: string;
  response?: string | null; // ✅ Allows cases where response is unavailable
  timestamp: Date | string; // ✅ Allows Date or string for serialization
  status: "active" | "archived" | "resolved"; // ✅ Tracks conversation state

}
