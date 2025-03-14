import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth";
import {
  connectDB,
  disconnectDB,
  checkDBHealth,
  listTables,
  getTableSchema,
  executeQuery,
  handleCreateUser as createUser, // ✅ Fixes incorrect import
  handleUpdateUserRole as updateUserRole,
  handleDeleteUser as deleteUser,
  handleCreateConversation as createConversation, // ✅ Fixes incorrect import
  handleGetConversations as getConversations
} from "../controllers/db.controller";


const router = Router();

// ✅ Database Connection Management
router.post("/connect", verifyToken, requireRole(["admin"]), connectDB);
router.post("/disconnect", verifyToken, requireRole(["admin"]), disconnectDB);

// ✅ Database Health Check
router.get("/health", verifyToken, checkDBHealth);

// ✅ Fetch Tables & Schema
router.get("/tables", verifyToken, requireRole(["admin"]), listTables);
router.get("/schema/:table", verifyToken, requireRole(["admin"]), getTableSchema);

// ✅ Query Execution (READ-ONLY)
router.post("/query", verifyToken, executeQuery);

// ✅ User Management
router.post("/user", verifyToken, requireRole(["admin"]), createUser);
router.put("/user/:id/role", verifyToken, requireRole(["admin"]), updateUserRole);
router.delete("/user/:id", verifyToken, requireRole(["admin"]), deleteUser);

// ✅ Conversation Management
router.post("/conversation", verifyToken, createConversation);
router.get("/conversations", verifyToken, getConversations);

export default router;
