// src/controllers/users.controller.ts
import { Request, Response } from "express";
import { getUsers, getUser, updateUserById, deleteUserById } from "../services/user.service";
import { AuthRequest } from "../middleware/auth";

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const user = await getUser(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // ✅ Restrict users from viewing other user profiles unless they are admin
    if (req.user.role !== "admin" && req.user.id !== Number(userId)) {
      res.status(403).json({ message: "Unauthorized access to user profile" });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error fetching user" });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const { username, role } = req.body;

    // ✅ Input validation
    if (username && typeof username !== "string") {
      res.status(400).json({ message: "Invalid username format" });
      return;
    }
    if (role && !["user", "admin"].includes(role)) {
      res.status(400).json({ message: "Invalid role" });
      return;
    }

    // ✅ Users can only update their own profile unless they are admin
    if (req.user.role !== "admin" && req.user.id !== Number(userId)) {
      res.status(403).json({ message: "You can only update your own profile" });
      return;
    }

    const updatedUser = await updateUserById(userId, req.body);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating user" });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    // ✅ Ensure only admins can delete users
    if (req.user.role !== "admin") {
      res.status(403).json({ message: "Only admins can delete users" });
      return;
    }

    await deleteUserById(userId);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Error deleting user" });
  }
};
