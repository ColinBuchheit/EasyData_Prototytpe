import { Request, Response } from "express";
import {
  saveConversation,
  fetchUserConversations,
  fetchConversationById,
  removeConversation,
} from "../services/conversation.service";
import logger from "../config/logger";
import { AuthRequest } from "../middleware/auth";
import { ObjectId } from "mongodb";

/**
 * ✅ Store a new conversation message in MongoDB
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

    const conversation = await saveConversation(userId, agent_name, message, response);
    res.status(201).json({ success: true, conversation });
  } catch (error) {
    logger.error(`❌ Error storing conversation: ${(error as Error).message}`);
    res.status(500).json({ message: "Error storing conversation" });
  }
};

/**
 * ✅ Fetch user conversation history from MongoDB
 */
export const getUserConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 10;
    const offset = Number(req.query.offset) || 0;

    const conversations = await fetchUserConversations(req.user.id, limit, offset);
    res.json({ success: true, conversations });
  } catch (error) {
    logger.error(`❌ Error fetching conversations: ${(error as Error).message}`);
    res.status(500).json({ message: "Error fetching conversations" });
  }
};

/**
 * ✅ Fetch a specific conversation by ID from MongoDB
 */
export const getConversationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversation_id } = req.params;
    if (!conversation_id) {
      res.status(400).json({ message: "❌ Conversation ID is required." });
      return;
    }

    const conversation = await fetchConversationById(conversation_id, req.user.id);
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

export const deleteConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversation_id } = req.params;
    const userId = req.user.id;

    if (!conversation_id || !ObjectId.isValid(conversation_id)) {
      res.status(400).json({ success: false, message: "Invalid conversation ID." });
      return;
    }

    const deleted = await removeConversation(conversation_id, userId);

    if (!deleted) {
      res.status(404).json({ success: false, message: "Conversation not found or unauthorized." });
      return;
    }

    res.json({ success: true, message: "Conversation deleted successfully." });
  } catch (error) {
    logger.error(`❌ Error deleting conversation: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: "Failed to delete conversation." });
  }
};