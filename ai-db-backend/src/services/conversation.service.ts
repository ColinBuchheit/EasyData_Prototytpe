import { pool } from "../config/db";
import logger from "../config/logger";

/**
 * ✅ Store a new conversation
 */
export async function saveConversation(userId: number, agentName: string, message: string, response: string | null) {
  try {
    const result = await pool.query(
      `INSERT INTO conversations (user_id, agent_name, message, response, timestamp, status) 
       VALUES ($1, $2, $3, $4, NOW(), 'active') 
       RETURNING *`,
      [userId, agentName, message, response]
    );

    return result.rows[0];
  } catch (error) {
    logger.error(`❌ Error saving conversation: ${(error as Error).message}`);
    throw new Error("Failed to save conversation.");
  }
}

/**
 * ✅ Get user conversation history (with pagination)
 */
export async function fetchUserConversations(userId: number, limit: number, offset: number) {
  try {
    const result = await pool.query(
      `SELECT * FROM conversations 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  } catch (error) {
    logger.error(`❌ Error fetching user conversations: ${(error as Error).message}`);
    throw new Error("Failed to fetch conversations.");
  }
}

/**
 * ✅ Get a specific conversation by ID (ensure user owns it)
 */
export async function fetchConversationById(conversationId: number, userId: number) {
    try {
      const result = await pool.query(
        `SELECT * FROM conversations 
         WHERE id = $1 AND user_id = $2`,
        [conversationId, userId]
      );
  
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`❌ Error retrieving conversation ID ${conversationId} for User ${userId}: ${(error as Error).message}`);
      throw new Error("Failed to retrieve conversation.");
    }
  }  

/**
 * ✅ Delete a conversation (only if user owns it)
 */
export async function removeConversation(conversationId: number, userId: number) {
  try {
    const result = await pool.query(
      `DELETE FROM conversations 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [conversationId, userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error(`❌ Error deleting conversation: ${(error as Error).message}`);
    throw new Error("Failed to delete conversation.");
  }
}
