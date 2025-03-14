import { Request, Response } from "express";
import {
  saveConversation,
  fetchUserConversations,
  fetchConversationById,
  removeConversation,
} from "../services/conversation.service";
import logger from "../config/logger";
import { AuthRequest } from "../middleware/auth";

/**
 * ✅ Store a new conversation message
 */
export const storeConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { agent_name, message, response } = req.body;
    const userId = req.user.id;

    if (!agent_name || typeof agent_name !== "string" || agent_name.trim() === "") {
        res.status(400).json({ message: "❌ Valid agent name is required." });
        return;
      }
      
      if (!message || typeof message !== "string" || message.trim() === "") {
        res.status(400).json({ message: "❌ Valid message is required." });
        return;
      }
      
      if (response !== null && typeof response !== "string") {
        res.status(400).json({ message: "❌ Response must be a string or null." });
        return;
      }
      

    const conversation = await saveConversation(userId, agent_name, message, response);
    res.status(201).json({ success: true, conversation });
  } catch (error) {
    logger.error(`❌ Error storing conversation: ${(error as Error).message}`);
    res.status(500).json({ message: "Error storing conversation" });
  }
};

/**
 * ✅ Get conversation history for a user
 */
export const getUserConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const limit = Number(req.query.limit);
      const offset = Number(req.query.offset);
  
      if (isNaN(limit) || limit < 1 || limit > 100) {
        res.status(400).json({ message: "❌ Invalid limit value (1-100 allowed)." });
        return;
      }
  
      if (isNaN(offset) || offset < 0) {
        res.status(400).json({ message: "❌ Invalid offset value." });
        return;
      }
  
      const conversations = await fetchUserConversations(req.user.id, limit, offset);
      res.json({ success: true, conversations });
    } catch (error) {
      logger.error(`❌ Error fetching conversations: ${(error as Error).message}`);
      res.status(500).json({ message: "Error fetching conversations" });
    }
  };
  

/**
 * ✅ Get a specific conversation by ID
 */
export const getConversationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversation_id } = req.params;
    if (!conversation_id) {
      res.status(400).json({ message: "❌ Conversation ID is required." });
      return;
    }

    const conversation = await fetchConversationById(Number(conversation_id), req.user.id);
    if (!conversation) {
      res.status(404).json({ message: "❌ Conversation not found." });
      return;
    }

    res.json({ success: true, conversation });
  } catch (error) {
    logger.error(`❌ Error retrieving conversation: ${(error as Error).message}`);
    res.status(500).json({ message: "Error retrieving conversation" });
  }
};

/**
 * ✅ Delete a conversation
 */
export const deleteConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversation_id } = req.params;
    if (!conversation_id) {
      res.status(400).json({ message: "❌ Conversation ID is required." });
      return;
    }

    const success = await removeConversation(Number(conversation_id), req.user.id);
    if (!success) {
      res.status(403).json({ message: "❌ Unauthorized to delete this conversation." });
      return;
    }

    res.json({ success: true, message: "✅ Conversation deleted successfully." });
  } catch (error) {
    logger.error(`❌ Error deleting conversation: ${(error as Error).message}`);
    res.status(500).json({ message: "Error deleting conversation" });
  }
};
