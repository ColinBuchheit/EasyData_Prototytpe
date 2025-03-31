// src/modules/user/controllers/preference.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../../modules/auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { PreferenceService } from "../services/preference.service";

const prefLogger = createContextLogger("PreferenceController");

/**
 * Get user preferences
 */
export const getUserPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const preferences = await PreferenceService.getPreferences(req.user.id);
  
  if (!preferences) {
    return res.status(404).json({ success: false, message: "Preferences not found" });
  }
  
  res.json({
    success: true,
    data: preferences
  });
});

/**
 * Update user preferences
 */

/**Let
 * Update user preferences
 */
export const updateUserPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  const {
    theme,
    defaultDatabaseId,
    notificationSettings,
    dashboardSettings,
    uiSettings
  } = req.body;
  
  try {
    const updatedPreferences = await PreferenceService.updatePreferences(req.user.id, {
      theme,
      defaultDatabaseId,
      notificationSettings,
      dashboardSettings,
      uiSettings
    });
    
    res.json({
      success: true,
      data: updatedPreferences
    });
  } catch (error) {
    prefLogger.error(`Error updating preferences: ${(error as Error).message}`);
    res.status(400).json({ success: false, message: (error as Error).message });
  }
});

/**
 * Reset user preferences to defaults
 */
export const resetUserPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
  }

  try {
    const defaultPreferences = await PreferenceService.resetPreferences(req.user.id);
    
    res.json({
      success: true,
      data: defaultPreferences
    });
  } catch (error) {
    prefLogger.error(`Error resetting preferences: ${(error as Error).message}`);
    res.status(400).json({ success: false, message: (error as Error).message });
  }
});