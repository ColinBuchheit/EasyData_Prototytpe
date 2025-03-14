import { Request, Response } from "express";
import {
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
  fetchTables,
  fetchTableSchema,
  runQuery,
  createUser as createUserService,  // ✅ Prevents import conflicts
  updateUserRole as updateUserRoleService,
  deleteUser as deleteUserService,
  createConversation as createConversationService,
  getConversations as getConversationsService
} from "../services/db.service";

import logger from "../config/logger";
import { AuthRequest } from "../middleware/auth";

/**
 * ✅ Connect a user to the AppDB.
 */
export async function connectDB(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user.id;
    const response = await connectDatabase(userId);
    res.json(response);
  } catch (error) {
    logger.error(`❌ Database connection failed: ${(error as Error).message}`);
    res.status(500).json({ message: "❌ Database connection failed.", error: (error as Error).message });
  }
}

/**
 * ✅ Check if the database is online.
 */
export async function checkDBHealth(req: Request, res: Response): Promise<void> {
  try {
    const status = await checkDatabaseHealth(); // Calls service function
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ message: "❌ Database health check failed.", error: (error as Error).message });
  }
}


/**
 * ✅ Disconnect a user from the AppDB.
 */
export async function disconnectDB(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user.id;
    const response = await disconnectDatabase(userId);
    res.json(response);
  } catch (error) {
    logger.error(`❌ Failed to disconnect database: ${(error as Error).message}`);
    res.status(500).json({ message: "❌ Database disconnection failed.", error: (error as Error).message });
  }
}

/**
 * ✅ List all tables in the AppDB.
 */
export async function listTables(req: AuthRequest, res: Response): Promise<void> {
  try {
    const tables = await fetchTables();
    res.json({ tables });
  } catch (error) {
    res.status(500).json({ message: "❌ Failed to retrieve tables.", error: (error as Error).message });
  }
}

/**
 * ✅ Fetch the schema of a specific table.
 */
export async function getTableSchema(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { table } = req.params;
    const schema = await fetchTableSchema(table);
    res.json({ schema });
  } catch (error) {
    res.status(500).json({ message: `❌ Failed to retrieve schema for table: ${req.params.table}`, error: (error as Error).message });
  }
}

/**
 * ✅ Execute a query on the AppDB.
 */
export async function executeQuery(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ message: "❌ No query provided." });
      return;
    }

    const result = await runQuery(query);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ message: "❌ Query execution failed.", error: (error as Error).message });
  }
}

/**
 * ✅ Create a new user.
 */
export async function handleCreateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { username, email, passwordHash, role } = req.body;
    const user = await createUserService(username, email, passwordHash, role); // ✅ Matches service function
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: "❌ Failed to create user.", error: (error as Error).message });
  }
}

/**
 * ✅ Update a user's role.
 */
export async function handleUpdateUserRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { newRole } = req.body;

    const user = await updateUserRoleService(adminId, Number(id), newRole); // ✅ Matches correct argument count
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: "❌ Failed to update user role.", error: (error as Error).message });
  }
}

/**
 * ✅ Delete a user.
 */
export async function handleDeleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const adminId = req.user.id;
    const { id } = req.params;

    const user = await deleteUserService(adminId, Number(id)); // ✅ Matches correct argument count
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: "❌ Failed to delete user.", error: (error as Error).message });
  }
}

/**
 * ✅ Create a new conversation.
 */
export async function handleCreateConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { agentName, message, response } = req.body;
    const userId = req.user.id;

    const conversation = await createConversationService(userId, agentName, message, response); // ✅ Matches correct argument count
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ message: "❌ Failed to create conversation.", error: (error as Error).message });
  }
}

/**
 * ✅ Fetch a user's conversation history.
 */
export async function handleGetConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user.id;
    const conversations = await getConversationsService(userId); // ✅ Matches correct argument count
    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ message: "❌ Failed to retrieve conversations.", error: (error as Error).message });
  }
}

