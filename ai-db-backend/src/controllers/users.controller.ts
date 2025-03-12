import { Request, Response } from "express";
import {
  getUsers,
  getUser,
  updateUserById,
  deleteUserById,
} from "../services/user.service";
import { AuthRequest } from "../middleware/auth";
import logger from "../config/logger";
import { activeConnections } from "../server"; // ✅ Now it will work

/**
 * Retrieves all users (Admin-only) with pagination.
 */
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user.role !== "admin") {
      res.status(403).json({ message: "❌ Only admins can view all users" });
      return;
    }

    // Ensure proper parsing of query parameters
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const users = await getUsers(limit, offset);
    
    logger.info(`✅ Admin ${req.user.id} retrieved users with pagination (limit: ${limit}, offset: ${offset}).`);
    res.json(users);
  } catch (error: unknown) {
    logger.error("❌ Error fetching users:", (error as Error).message);
    res.status(500).json({ message: "Error fetching users", error: (error as Error).message });
  }
};

/**
 * Retrieves a specific user (Admins or self).
 */
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!userId || (isNaN(Number(userId)) && !isValidNoSQLId(userId))) {
      res.status(400).json({ message: "❌ Invalid User ID." });
      return;
    }

    const user = await getUser(userId);
    if (!user) {
      res.status(404).json({ message: "❌ User not found" });
      return;
    }

    if (req.user.role !== "admin" && String(req.user.id) !== userId) {
      res.status(403).json({ message: "❌ Unauthorized access to user profile" });
      return;
    }

    logger.info(`✅ User ${req.user.id} accessed profile of User ${userId}.`);
    res.json(user);
  } catch (error: unknown) {
    logger.error("❌ Error fetching user:", (error as Error).message);
    res.status(500).json({ message: "Error fetching user", error: (error as Error).message });
  }
};

/**
 * Updates a user profile (Users can update themselves, but only admins can update roles).
 */
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const { username, email, role } = req.body;

    if (!userId || (isNaN(Number(userId)) && !isValidNoSQLId(userId))) {
      res.status(400).json({ message: "❌ Invalid User ID." });
      return;
    }
    

    if (req.user.role !== "admin" && String(req.user.id) !== userId) {
      res.status(403).json({ message: "❌ You can only update your own profile" });
      return;
    }

// ✅ Allow only these fields to be updated (Prevents SQL Injection)
    const allowedFields = ["username", "email"];
    const updateData = Object.keys(req.body)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {} as Record<string, string>);

    const updatedUser = await updateUserById(userId, updateData, req.user.role);

    logger.info(`✅ User ${req.user.id} updated profile of User ${userId}.`);
    res.json(updatedUser);

    // ✅ Broadcast update to Redux clients via WebSocket
    if (activeConnections.has(Number(userId))) {
      activeConnections.get(Number(userId))?.send(JSON.stringify({
        type: "user_update",
        data: updatedUser
      }));
    }
  } catch (error: unknown) {
    logger.error("❌ Error updating user:", (error as Error).message);
    res.status(500).json({ message: "Error updating user", error: (error as Error).message });
  }
};




/**
 * Deletes a user (Admin-only). Admins cannot delete themselves.
 */
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!userId || (isNaN(Number(userId)) && !isValidNoSQLId(userId))) {
      res.status(400).json({ message: "❌ Invalid User ID." });
      return;
    }
    

    if (req.user.role !== "admin") {
      res.status(403).json({ message: "❌ Only admins can delete users" });
      return;
    }

    if (String(req.user.id) === userId) {
      res.status(403).json({ message: "❌ Admins cannot delete themselves" });
      return;
    }

    const deletedUser = await deleteUserById(userId);
    if (!deletedUser) {
      res.status(404).json({ message: "❌ User not found or already deleted." });
      return;
    }

    logger.info(`✅ Admin ${req.user.id} deleted User ${userId}.`);
    res.json({ message: "✅ User deleted successfully" });

    // ✅ Notify all clients that user was deleted
    for (const [uid, ws] of activeConnections) {
      ws.send(JSON.stringify({ type: "user_deleted", data: userId }));
    }
  } catch (error: unknown) {
    logger.error("❌ Error deleting user:", (error as Error).message);
    res.status(500).json({ message: "Error deleting user", error: (error as Error).message });
  }
};


/**
 * Helper function to validate NoSQL user IDs.
 */
function isValidNoSQLId(userId: string): boolean {
  return /^[a-f\d]{24}$/i.test(userId) || userId.includes("@"); // MongoDB ObjectId or Firebase UID
}
