// src/modules/user/controllers/profile.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { ProfileService } from "../services/profile.service";

const profileLogger = createContextLogger("ProfileController");

/**
 * Get user profile
 */
export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const profile = await ProfileService.getProfile(req.user.id);
  
  if (!profile) {
    return res.status(404).json({ success: false, message: "Profile not found" });
  }
  
  res.json({
    success: true,
    data: profile
  });
});

/**
 * Get another user's profile
 */
export const getOtherUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const userId = parseInt(req.params.userId, 10);
  
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }
  
  // Only admins can view other users' full profiles
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ success: false, message: "Forbidden: You can only view your own profile" });
  }
  
  const profile = await ProfileService.getProfile(userId);
  
  if (!profile) {
    return res.status(404).json({ success: false, message: "Profile not found" });
  }
  
  res.json({
    success: true,
    data: profile
  });
});

/**
 * Update user profile
 */
export const updateUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const {
    firstName,
    lastName,
    displayName,
    avatar,
    bio,
    jobTitle,
    organization,
    department,
    location,
    timezone,
    phoneNumber,
    contactEmail,
    socialLinks
  } = req.body;
  
  try {
    const updatedProfile = await ProfileService.updateProfile(req.user.id, {
      firstName,
      lastName,
      displayName,
      avatar,
      bio,
      jobTitle,
      organization,
      department,
      location,
      timezone,
      phoneNumber,
      contactEmail,
      socialLinks
    });
    
    res.json({
      success: true,
      data: updatedProfile
    });
  } catch (error) {
    profileLogger.error(`Error updating profile: ${(error as Error).message}`);
    res.status(400).json({ success: false, message: (error as Error).message });
  }
});