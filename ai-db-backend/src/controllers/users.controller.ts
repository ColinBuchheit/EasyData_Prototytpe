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
 * Retrieves all users (Admin-only).
 */
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user.role !== "admin") {
      res.status(403).json({ message: "❌ Only admins can view all users" });
      return;
    }

    const users = await getUsers();
    logger.info(`✅ Admin ${req.user.id} retrieved all users.`);
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

    if (!userId || isNaN(Number(userId))) {
      res.status(400).json({ message: "❌ Invalid User ID." });
      return;
    }

    const user = await getUser(userId); // ✅ Ensure `userId` is passed as a `string`

    if (!user) {
      res.status(404).json({ message: "❌ User not found" });
      return;
    }

    // ✅ Enforce role-based access control
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

    if (!userId || isNaN(Number(userId))) {
      res.status(400).json({ message: "❌ Invalid User ID." });
      return;
    }

    // ✅ Validate username
    if (username && typeof username !== "string") {
      res.status(400).json({ message: "❌ Invalid username format" });
      return;
    }

    // ✅ Validate email format
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      res.status(400).json({ message: "❌ Invalid email format" });
      return;
    }

    // ✅ Prevent non-admins from updating roles
    if (role && req.user.role !== "admin") {
      res.status(403).json({ message: "❌ Only admins can change roles" });
      return;
    }

    // ✅ Prevent admin role changes unless a super-admin is performing them
    const targetUser = await getUser(userId);
    if (!targetUser) {
      res.status(404).json({ message: "❌ User not found" });
      return;
    }

    if (role === "admin" && req.user.role !== "super-admin") {
      res.status(403).json({ message: "❌ Only super-admins can assign admin roles." });
      return;
    }

    // ✅ Ensure users can only update their own profile unless they are admin
    if (req.user.role !== "admin" && String(req.user.id) !== userId) {
      res.status(403).json({ message: "❌ You can only update your own profile" });
      return;
    }

    const updatedUser = await updateUserById(userId, req.body); // ✅ Ensure `userId` is passed as `string`
    logger.info(`✅ User ${req.user.id} updated profile of User ${userId}.`);
    res.json(updatedUser);
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

    if (!userId || isNaN(Number(userId))) {
      res.status(400).json({ message: "❌ Invalid User ID." });
      return;
    }

    // ✅ Ensure only admins can delete users
    if (req.user.role !== "admin") {
      res.status(403).json({ message: "❌ Only admins can delete users" });
      return;
    }

    // ✅ Prevent self-deletion for admins
    if (String(req.user.id) === userId) {
      res.status(403).json({ message: "❌ Admins cannot delete themselves" });
      return;
    }

    await deleteUserById(userId); // ✅ Ensure `userId` is passed as `string`
    logger.info(`✅ Admin ${req.user.id} deleted User ${userId}.`);
    res.json({ message: "✅ User deleted successfully" });
  } catch (error: unknown) {
    logger.error("❌ Error deleting user:", (error as Error).message);
    res.status(500).json({ message: "Error deleting user", error: (error as Error).message });
  }
};
