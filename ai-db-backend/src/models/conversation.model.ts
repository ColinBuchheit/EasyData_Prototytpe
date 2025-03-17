export interface Conversation {
  id: number;
  user_id: number;
  agent_name: string;
  user_message: string;
  agents_contributed: string[]; // ✅ Stores list of agents that worked on the response
  response?: string | null;
  orchestration_logs?: string[]; // ✅ Logs decisions made by the Orchestration Agent
  timestamp: Date | string;
  status: "active" | "archived" | "resolved";
}
