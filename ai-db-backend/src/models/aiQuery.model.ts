export interface AIQuery {
  id: number;
  user_id: number;
  user_message: string; // ✅ Stores the original user input
  agents_involved: string[]; // ✅ Tracks which agents participated
  processing_status: "pending" | "in_progress" | "validated" | "finalized"; // ✅ Tracks processing stages
  ai_response: string | null; // ✅ Final response after all agents approve
  error_log?: string | null; // ✅ Stores errors if any agent rejects the response
  created_at: Date | string;
  updated_at?: Date | string;
}
