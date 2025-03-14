import { Router } from "express";
import {
  storeConversation,
  getUserConversations,
  getConversationById,
  deleteConversation,
} from "../controllers/conversation.controller";
import { verifyToken } from "../middleware/auth";

const router = Router();

/**
 * ✅ Store a new conversation
 * 🔹 Requires authentication
 */
router.post("/", verifyToken, storeConversation);

/**
 * ✅ Get conversation history
 * 🔹 Requires authentication
 */
router.get("/history", verifyToken, getUserConversations);

/**
 * ✅ Get a specific conversation by ID
 * 🔹 Requires authentication
 */
router.get("/:conversation_id", verifyToken, getConversationById);

/**
 * ✅ Delete a conversation by ID
 * 🔹 Requires authentication
 */
router.delete("/:conversation_id", verifyToken, deleteConversation);

export default router;
