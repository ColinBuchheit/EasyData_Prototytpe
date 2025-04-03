// src/modules/user/services/preference.service.ts

import { pool } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { PreferenceUpdateData, UserPreferences } from "../models/preference.model";
import { UserService } from "./user.service";

const prefLogger = createContextLogger("PreferenceService");

export class PreferenceService {
  /**
   * Get user preferences
   */
  static async getPreferences(userId: number): Promise<UserPreferences | null> {
    try {
      // First verify user exists
      const user = await UserService.getUserById(userId);
      if (!user) {
        return null;
      }
      
      // Get preferences data
      const result = await pool.query(
        `SELECT 
          user_id as "userId", theme, default_database_id as "defaultDatabaseId",
          notification_settings as "notificationSettings", dashboard_settings as "dashboardSettings",
          ui_settings as "uiSettings", updated_at as "updatedAt"
         FROM user_preferences
         WHERE user_id = $1`,
        [userId]
      );
      
      // If preferences don't exist, return defaults
      if (result.rows.length === 0) {
        return {
          userId,
          theme: 'system',
          defaultDatabaseId: undefined,
          notificationSettings: {
            emailNotifications: true,
            queryCompletionAlerts: true,
            securityAlerts: true,
            performanceAlerts: false,
            weeklyDigest: true
          },
          dashboardSettings: {
            defaultView: 'queries',
            visibleWidgets: ['recentQueries', 'databaseStatus', 'performanceMetrics']
          },
          uiSettings: {
            resultsPerPage: 20,
            codeHighlightTheme: 'github',
            timezone: 'UTC',
            dateFormat: 'MMM DD, YYYY',
            language: 'en'
          },
          updatedAt: new Date()
        };
      }
      
      // Parse JSON fields
      const preferences = result.rows[0];
      
      if (preferences.notificationSettings) {
        preferences.notificationSettings = typeof preferences.notificationSettings === 'string' 
          ? JSON.parse(preferences.notificationSettings) 
          : preferences.notificationSettings;
      }
      
      if (preferences.dashboardSettings) {
        preferences.dashboardSettings = typeof preferences.dashboardSettings === 'string' 
          ? JSON.parse(preferences.dashboardSettings) 
          : preferences.dashboardSettings;
      }
      
      if (preferences.uiSettings) {
        preferences.uiSettings = typeof preferences.uiSettings === 'string' 
          ? JSON.parse(preferences.uiSettings) 
          : preferences.uiSettings;
      }
      
      return preferences;
    } catch (error) {
        prefLogger.error(`Error fetching preferences for user ${userId}: ${(error as Error).message}`);
        throw new Error(`Failed to fetch preferences: ${(error as Error).message}`);
      }
    }
  
    /**
     * Update user preferences
     */
    static async updatePreferences(userId: number, preferencesData: PreferenceUpdateData): Promise<UserPreferences> {
      try {
        // First verify user exists
        const user = await UserService.getUserById(userId);
        if (!user) {
          throw new Error(`User with ID ${userId} not found`);
        }
        
        // Check if preferences exist
        const existingPreferences = await this.getPreferences(userId);
        
        // Process JSON fields
        let notificationSettingsJson = null;
        if (preferencesData.notificationSettings) {
          // Merge with existing settings if available
          const mergedSettings = {
            ...(existingPreferences?.notificationSettings || {}),
            ...preferencesData.notificationSettings
          };
          
          notificationSettingsJson = JSON.stringify(mergedSettings);
        }
        
        let dashboardSettingsJson = null;
        if (preferencesData.dashboardSettings) {
          // Merge with existing settings if available
          const mergedSettings = {
            ...(existingPreferences?.dashboardSettings || {}),
            ...preferencesData.dashboardSettings
          };
          
          dashboardSettingsJson = JSON.stringify(mergedSettings);
        }
        
        let uiSettingsJson = null;
        if (preferencesData.uiSettings) {
          // Merge with existing settings if available
          const mergedSettings = {
            ...(existingPreferences?.uiSettings || {}),
            ...preferencesData.uiSettings
          };
          
          uiSettingsJson = JSON.stringify(mergedSettings);
        }
        
        if (existingPreferences && existingPreferences.userId === userId) {
          // Update existing preferences
          const setValues = [];
          const queryParams: any[] = [userId]; // First param is user_id
          let paramIndex = 1;
          
          if (preferencesData.theme !== undefined) {
            paramIndex++;
            queryParams.push(preferencesData.theme);
            setValues.push(`theme = $${paramIndex}`);
          }
          
          if (preferencesData.defaultDatabaseId !== undefined) {
            paramIndex++;
            queryParams.push(preferencesData.defaultDatabaseId);
            setValues.push(`default_database_id = $${paramIndex}`);
          }
          
          if (notificationSettingsJson !== null) {
            paramIndex++;
            queryParams.push(notificationSettingsJson);
            setValues.push(`notification_settings = $${paramIndex}`);
          }
          
          if (dashboardSettingsJson !== null) {
            paramIndex++;
            queryParams.push(dashboardSettingsJson);
            setValues.push(`dashboard_settings = $${paramIndex}`);
          }
          
          if (uiSettingsJson !== null) {
            paramIndex++;
            queryParams.push(uiSettingsJson);
            setValues.push(`ui_settings = $${paramIndex}`);
          }
          
          // Always update the updated_at timestamp
          setValues.push(`updated_at = NOW()`);
          
          const query = `
            UPDATE user_preferences
            SET ${setValues.join(', ')}
            WHERE user_id = $1
            RETURNING 
              user_id as "userId", theme, default_database_id as "defaultDatabaseId",
              notification_settings as "notificationSettings", dashboard_settings as "dashboardSettings",
              ui_settings as "uiSettings", updated_at as "updatedAt"
          `;
          
          const result = await pool.query(query, queryParams);
          const updatedPreferences = result.rows[0];
          
          // Parse JSON fields
          if (updatedPreferences.notificationSettings) {
            updatedPreferences.notificationSettings = typeof updatedPreferences.notificationSettings === 'string' 
              ? JSON.parse(updatedPreferences.notificationSettings) 
              : updatedPreferences.notificationSettings;
          }
          
          if (updatedPreferences.dashboardSettings) {
            updatedPreferences.dashboardSettings = typeof updatedPreferences.dashboardSettings === 'string' 
              ? JSON.parse(updatedPreferences.dashboardSettings) 
              : updatedPreferences.dashboardSettings;
          }
          
          if (updatedPreferences.uiSettings) {
            updatedPreferences.uiSettings = typeof updatedPreferences.uiSettings === 'string' 
              ? JSON.parse(updatedPreferences.uiSettings) 
              : updatedPreferences.uiSettings;
          }
          
          prefLogger.info(`Updated preferences for user ${userId}`);
          return updatedPreferences;
        } else {
          // Create default preferences, then apply updates
          const defaultPreferences = (await this.getPreferences(userId)) as UserPreferences;
          
          // Apply updates to the default preferences
          const updatedPreferences = {
            ...defaultPreferences,
            ...preferencesData,
            // Merge nested objects if provided
            notificationSettings: preferencesData.notificationSettings 
              ? { ...defaultPreferences.notificationSettings, ...preferencesData.notificationSettings } 
              : defaultPreferences.notificationSettings,
            dashboardSettings: preferencesData.dashboardSettings 
              ? { ...defaultPreferences.dashboardSettings, ...preferencesData.dashboardSettings } 
              : defaultPreferences.dashboardSettings,
            uiSettings: preferencesData.uiSettings 
              ? { ...defaultPreferences.uiSettings, ...preferencesData.uiSettings } 
              : defaultPreferences.uiSettings,
          };
          
          // Insert preferences
          const query = `
            INSERT INTO user_preferences (
              user_id, theme, default_database_id,
              notification_settings, dashboard_settings, ui_settings, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING 
              user_id as "userId", theme, default_database_id as "defaultDatabaseId",
              notification_settings as "notificationSettings", dashboard_settings as "dashboardSettings",
              ui_settings as "uiSettings", updated_at as "updatedAt"
          `;
          
          const result = await pool.query(query, [
            userId,
            updatedPreferences.theme,
            updatedPreferences.defaultDatabaseId,
            JSON.stringify(updatedPreferences.notificationSettings),
            JSON.stringify(updatedPreferences.dashboardSettings),
            JSON.stringify(updatedPreferences.uiSettings)
          ]);
          
          const newPreferences = result.rows[0];
          
          // Parse JSON fields
          if (newPreferences.notificationSettings) {
            newPreferences.notificationSettings = typeof newPreferences.notificationSettings === 'string' 
              ? JSON.parse(newPreferences.notificationSettings) 
              : newPreferences.notificationSettings;
          }
          
          if (newPreferences.dashboardSettings) {
            newPreferences.dashboardSettings = typeof newPreferences.dashboardSettings === 'string' 
              ? JSON.parse(newPreferences.dashboardSettings) 
              : newPreferences.dashboardSettings;
          }
          
          if (newPreferences.uiSettings) {
            newPreferences.uiSettings = typeof newPreferences.uiSettings === 'string' 
              ? JSON.parse(newPreferences.uiSettings) 
              : newPreferences.uiSettings;
          }
          
          prefLogger.info(`Created preferences for user ${userId}`);
          return newPreferences;
        }
      } catch (error) {
        prefLogger.error(`Error updating preferences for user ${userId}: ${(error as Error).message}`);
        throw new Error(`Failed to update preferences: ${(error as Error).message}`);
      }
    }
  
    /**
     * Reset user preferences to defaults
     */
    static async resetPreferences(userId: number): Promise<UserPreferences> {
      try {
        // First verify user exists
        const user = await UserService.getUserById(userId);
        if (!user) {
          throw new Error(`User with ID ${userId} not found`);
        }
        
        // Delete existing preferences
        await pool.query(
          `DELETE FROM user_preferences WHERE user_id = $1`,
          [userId]
        );
        
        // Get default preferences
        const defaultPreferences = {
          userId,
          theme: 'system',
          defaultDatabaseId: undefined,
          notificationSettings: {
            emailNotifications: true,
            queryCompletionAlerts: true,
            securityAlerts: true,
            performanceAlerts: false,
            weeklyDigest: true
          },
          dashboardSettings: {
            defaultView: 'queries',
            visibleWidgets: ['recentQueries', 'databaseStatus', 'performanceMetrics']
          },
          uiSettings: {
            resultsPerPage: 20,
            codeHighlightTheme: 'github',
            timezone: 'UTC',
            dateFormat: 'MMM DD, YYYY',
            language: 'en'
          },
          updatedAt: new Date()
        };
        
        // Insert default preferences
        const query = `
          INSERT INTO user_preferences (
            user_id, theme, default_database_id,
            notification_settings, dashboard_settings, ui_settings, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING 
            user_id as "userId", theme, default_database_id as "defaultDatabaseId",
            notification_settings as "notificationSettings", dashboard_settings as "dashboardSettings",
            ui_settings as "uiSettings", updated_at as "updatedAt"
        `;
        
        const result = await pool.query(query, [
          userId,
          defaultPreferences.theme,
          null, // defaultDatabaseId
          JSON.stringify(defaultPreferences.notificationSettings),
          JSON.stringify(defaultPreferences.dashboardSettings),
          JSON.stringify(defaultPreferences.uiSettings)
        ]);
        
        const newPreferences = result.rows[0];
        
        // Parse JSON fields
        if (newPreferences.notificationSettings) {
          newPreferences.notificationSettings = typeof newPreferences.notificationSettings === 'string' 
            ? JSON.parse(newPreferences.notificationSettings) 
            : newPreferences.notificationSettings;
        }
        
        if (newPreferences.dashboardSettings) {
          newPreferences.dashboardSettings = typeof newPreferences.dashboardSettings === 'string' 
            ? JSON.parse(newPreferences.dashboardSettings) 
            : newPreferences.dashboardSettings;
        }
        
        if (newPreferences.uiSettings) {
          newPreferences.uiSettings = typeof newPreferences.uiSettings === 'string' 
            ? JSON.parse(newPreferences.uiSettings) 
            : newPreferences.uiSettings;
        }
        
        prefLogger.info(`Reset preferences for user ${userId}`);
        return newPreferences;
      } catch (error) {
        prefLogger.error(`Error resetting preferences for user ${userId}: ${(error as Error).message}`);
        throw error;
      }
    }
  }
  
  export default PreferenceService;