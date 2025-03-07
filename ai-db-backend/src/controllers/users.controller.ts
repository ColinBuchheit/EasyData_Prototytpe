import { Request, Response } from "express";
import {
  getUsers,
  getUser,
  updateUserById,
  deleteUserById,
} from "../services/user.service";
import { AuthRequest } from "../middleware/auth";
import logger from "../config/logger";

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

    // Call the updated `getUsers()` method
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

    if (username && typeof username !== "string") {
      res.status(400).json({ message: "❌ Invalid username format" });
      return;
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      res.status(400).json({ message: "❌ Invalid email format" });
      return;
    }

    if (role && req.user.role !== "super-admin") {
      res.status(403).json({ message: "❌ Only super-admins can change roles" });
      return;
    }

    await updateUserById(userId, req.body, req.user.role); // ✅ Now passing the requester’s role
    logger.info(`✅ User ${req.user.id} updated profile of User ${userId}.`);
    res.json(updateUser);
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

    const deletedUser = await deleteUserById(userId); // ✅ Now returns a boolean
    if (!deletedUser) {
      res.status(404).json({ message: "❌ User not found or already deleted." });
      return;
    }

    logger.info(`✅ Admin ${req.user.id} deleted User ${userId}.`);
    res.json({ message: "✅ User deleted successfully" });
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
