// src/modules/user/controllers/admin.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { ProfileService } from "../services/profile.service";
import { UserService } from "../services/user.service";
import { UserCreationData, UserListOptions, UserRole, UserStatus } from "../models/user.model";

const adminLogger = createContextLogger("AdminController");

/**
 * List all users with pagination and filtering
 */
export const listUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  const options: UserListOptions = {
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    sortBy: req.query.sortBy as string || 'createdAt',
    sortDirection: req.query.sortDirection === 'asc' ? 'asc' : 'desc',
    status: req.query.status as UserStatus,
    role: req.query.role as UserRole,
    search: req.query.search as string
  };
  
  try {
    const result = await UserService.listUsers(options);
    
    res.json({
      success: true,
      data: {
        users: result.users,
        total: result.total,
        limit: options.limit,
        offset: options.offset
      }
    });
  } catch (error) {
    adminLogger.error(`Error listing users: ${(error as Error).message}`);
    res.status(400).json({ success: false, message: (error as Error).message });
  }
});

/**
 * Get user details
 */
export const getUserDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  const userId = parseInt(req.params.userId, 10);
  
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }
  
  const user = await UserService.getUserById(userId);
  
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  
  const profile = await ProfileService.getProfile(userId);
  
  res.json({
    success: true,
    data: {
      user,
      profile
    }
  });
});

/**
 * Create a new user
 */
export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  const { username, email, password, role } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: "Username, email, and password are required" });
  }
  
  const userData: UserCreationData = {
    username,
    email,
    password,
    role: role as UserRole
  };
  
  try {
    const newUser = await UserService.createUser(userData);
    
    res.status(201).json({
      success: true,
      data: newUser
    });
  } catch (error) {
    adminLogger.error(`Error creating user: ${(error as Error).message}`);
    res.status(400).json({ success: false, message: (error as Error).message });
  }
});

/**
 * Update a user
 */
export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  const userId = parseInt(req.params.userId, 10);
  
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }
  
  const { username, email, role, status } = req.body;
  
  try {
    const updatedUser = await UserService.updateUser(userId, {
      username,
      email,
      role: role as UserRole,
      status: status as UserStatus
    });
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    adminLogger.error(`Error updating user: ${(error as Error).message}`);
    res.status(400).json({ success: false, message: (error as Error).message });
  }
});

/**
 * Delete a user
 */
export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  const userId = parseInt(req.params.userId, 10);
  
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }
  
  try {
    await UserService.deleteUser(userId);
    
    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    adminLogger.error(`Error deleting user: ${(error as Error).message}`);
    res.status(400).json({ success: false, message: (error as Error).message });
  }
});

/**
 * Change user status
 */
export const changeUserStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  const userId = parseInt(req.params.userId, 10);
  
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }
  
  const { status } = req.body;
  
  if (!status || !['active', 'inactive', 'pending', 'suspended'].includes(status)) {
    return res.status(400).json({ success: false, message: "Valid status is required" });
  }
  
  try {
    const updatedUser = await UserService.changeStatus(userId, status as UserStatus);
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    adminLogger.error(`Error changing user status: ${(error as Error).message}`);
    res.status(400).json({ success: false, message: (error as Error).message });
  }
});

/**
 * Change user role
 */
export const changeUserRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  // Admin only endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  const userId = parseInt(req.params.userId, 10);
  
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }
  
  const { role } = req.body;
  
  if (!role || !['admin', 'user', 'read-only'].includes(role)) {
    return res.status(400).json({ success: false, message: "Valid role is required" });
  }
  
  // Prevent changing your own role
  if (userId === req.user.id) {
    return res.status(400).json({ success: false, message: "You cannot change your own role" });
  }
  
  try {
    const updatedUser = await UserService.changeRole(userId, role as UserRole);
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    adminLogger.error(`Error changing user role: ${(error as Error).message}`);
    res.status(400).json({ success: false, message: (error as Error).message });
  }
});