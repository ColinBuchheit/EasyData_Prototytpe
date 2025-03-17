import { Request, Response } from "express";
import {
  getUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  updateUserPasswordById
} from "../services/user.service";
import { AuthRequest } from "../middleware/auth";
import logger from "../config/logger";

/**
 * ✅ Get all users (Admin-only) with pagination.
 */
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user.role !== "admin") {
      res.status(403).json({ message: "❌ Only admins can view all users." });
      return;
    }

    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const users = await getUsers(limit, offset);
    res.json(users);
  } catch (error) {
    logger.error(`❌ Error fetching users: ${(error as Error).message}`);
    res.status(500).json({ message: "Error fetching users" });
  }
};

/**
 * ✅ Get the logged-in user's profile.
 */
export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "❌ User not found." });
      return;
    }
    res.json(user);
  } catch (error) {
    logger.error(`❌ Error fetching user profile: ${(error as Error).message}`);
    res.status(500).json({ message: "Error fetching user profile" });
  }
};

/**
 * ✅ Get a specific user (Admin or Self).
 */
export const getUserByIdController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    if (req.user.role !== "admin" && req.user.id !== userId) {
      res.status(403).json({ message: "❌ Unauthorized access to user profile." });
      return;
    }

    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ message: "❌ User not found." });
      return;
    }

    res.json(user);
  } catch (error) {
    logger.error(`❌ Error fetching user: ${(error as Error).message}`);
    res.status(500).json({ message: "Error fetching user" });
  }
};

/**
 * ✅ Update a user's profile (Users update themselves, Admins can update anyone).
 */
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    const { username, email, role } = req.body;

    if (req.user.role !== "admin" && req.user.id !== userId) {
      res.status(403).json({ message: "❌ You can only update your own profile." });
      return;
    }

    // ✅ Only admins can modify roles
    if (role && req.user.role !== "admin") {
      res.status(403).json({ message: "❌ Only admins can change user roles." });
      return;
    }

    const updatedUser = await updateUserById(userId, { username, email, role }, req.user.role);
    
    logger.info(`✅ User ${userId} updated by ${req.user.id}`);
    res.json(updatedUser);
  } catch (error) {
    logger.error(`❌ Error updating user: ${(error as Error).message}`);
    res.status(500).json({ message: "Error updating user" });
  }
};

/**
 * ✅ Allow users to change their own password.
 */
export const updateUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      res.status(400).json({ message: "❌ Email, current password, and new password are required." });
      return;
    }

    // ✅ Enforce strong password policy
    const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      res.status(400).json({ message: "❌ Password must be at least 8 characters, include one uppercase letter, and one number." });
      return;
    }

    const success = await updateUserPasswordById(userId, email, currentPassword, newPassword);
    if (!success) {
      res.status(400).json({ message: "❌ Incorrect current password or invalid email." });
      return;
    }

    logger.info(`✅ Password updated for user ${userId}`);
    res.json({ message: "✅ Password updated successfully." });
  } catch (error) {
    logger.error(`❌ Error updating password: ${(error as Error).message}`);
    res.status(500).json({ message: "Error updating password" });
  }
};

/**
 * ✅ Delete a user (Admin-only, Cannot Delete Self).
 */
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);

    if (req.user.role !== "admin") {
      res.status(403).json({ message: "❌ Only admins can delete users." });
      return;
    }

    if (req.user.id === userId) {
      res.status(403).json({ message: "❌ Admins cannot delete themselves." });
      return;
    }

    await deleteUserById(userId);
    logger.info(`✅ User ${userId} deleted by Admin ${req.user.id}`);
    res.json({ message: "✅ User deleted successfully." });
  } catch (error) {
    logger.error(`❌ Error deleting user: ${(error as Error).message}`);
    res.status(500).json({ message: "Error deleting user" });
  }
};
