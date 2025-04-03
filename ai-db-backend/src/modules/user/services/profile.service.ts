// src/modules/user/services/profile.service.ts

import { pool } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { ProfileUpdateData, UserProfile } from "../models/profile.model";
import { UserService } from "./user.service";

const profileLogger = createContextLogger("ProfileService");

export class ProfileService {
  /**
   * Get user profile
   */
  static async getProfile(userId: number): Promise<UserProfile | null> {
    try {
      // First verify user exists
      const user = await UserService.getUserById(userId);
      if (!user) {
        return null;
      }
      
      // Get profile data
      const result = await pool.query(
        `SELECT 
          user_id as "userId", first_name as "firstName", last_name as "lastName",
          display_name as "displayName", avatar, bio, job_title as "jobTitle",
          organization, department, location, timezone, phone_number as "phoneNumber",
          contact_email as "contactEmail", social_links as "socialLinks",
          updated_at as "updatedAt"
         FROM user_profiles
         WHERE user_id = $1`,
        [userId]
      );
      
      // If profile doesn't exist, create minimal profile
      if (result.rows.length === 0) {
        return {
          userId,
          updatedAt: new Date()
        };
      }
      
      // Parse JSON fields
      const profile = result.rows[0];
      if (profile.socialLinks) {
        profile.socialLinks = typeof profile.socialLinks === 'string' 
          ? JSON.parse(profile.socialLinks) 
          : profile.socialLinks;
      }
      
      return profile;
    } catch (error) {
      profileLogger.error(`Error fetching profile for user ${userId}: ${(error as Error).message}`);
      throw new Error(`Failed to fetch profile: ${(error as Error).message}`);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: number, profileData: ProfileUpdateData): Promise<UserProfile> {
    try {
      // First verify user exists
      const user = await UserService.getUserById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      // Check if profile exists
      const existingProfile = await this.getProfile(userId);
      
      // Process social links
      let socialLinksJson = null;
      if (profileData.socialLinks) {
        socialLinksJson = JSON.stringify(profileData.socialLinks);
      }
      
      if (existingProfile && existingProfile.userId === userId) {
        // Update existing profile
        const setValues = [];
        const queryParams: any[] = [userId]; // First param is user_id
        let paramIndex = 1;
        
        if (profileData.firstName !== undefined) {
          paramIndex++;
          queryParams.push(profileData.firstName);
          setValues.push(`first_name = $${paramIndex}`);
        }
        
        if (profileData.lastName !== undefined) {
          paramIndex++;
          queryParams.push(profileData.lastName);
          setValues.push(`last_name = $${paramIndex}`);
        }
        
        if (profileData.displayName !== undefined) {
          paramIndex++;
          queryParams.push(profileData.displayName);
          setValues.push(`display_name = $${paramIndex}`);
        }
        
        if (profileData.avatar !== undefined) {
          paramIndex++;
          queryParams.push(profileData.avatar);
          setValues.push(`avatar = $${paramIndex}`);
        }
        
        if (profileData.bio !== undefined) {
          paramIndex++;
          queryParams.push(profileData.bio);
          setValues.push(`bio = $${paramIndex}`);
        }
        
        if (profileData.jobTitle !== undefined) {
          paramIndex++;
          queryParams.push(profileData.jobTitle);
          setValues.push(`job_title = $${paramIndex}`);
        }
        
        if (profileData.organization !== undefined) {
          paramIndex++;
          queryParams.push(profileData.organization);
          setValues.push(`organization = $${paramIndex}`);
        }
        
        if (profileData.department !== undefined) {
          paramIndex++;
          queryParams.push(profileData.department);
          setValues.push(`department = $${paramIndex}`);
        }
        
        if (profileData.location !== undefined) {
          paramIndex++;
          queryParams.push(profileData.location);
          setValues.push(`location = $${paramIndex}`);
        }
        
        if (profileData.timezone !== undefined) {
          paramIndex++;
          queryParams.push(profileData.timezone);
          setValues.push(`timezone = $${paramIndex}`);
        }
        
        if (profileData.phoneNumber !== undefined) {
          paramIndex++;
          queryParams.push(profileData.phoneNumber);
          setValues.push(`phone_number = $${paramIndex}`);
        }
        
        if (profileData.contactEmail !== undefined) {
          paramIndex++;
          queryParams.push(profileData.contactEmail);
          setValues.push(`contact_email = $${paramIndex}`);
        }
        
        if (profileData.socialLinks !== undefined) {
          paramIndex++;
          queryParams.push(socialLinksJson);
          setValues.push(`social_links = $${paramIndex}`);
        }
        
        // Always update the updated_at timestamp
        setValues.push(`updated_at = NOW()`);
        
        const query = `
          UPDATE user_profiles
          SET ${setValues.join(', ')}
          WHERE user_id = $1
          RETURNING 
            user_id as "userId", first_name as "firstName", last_name as "lastName",
            display_name as "displayName", avatar, bio, job_title as "jobTitle",
            organization, department, location, timezone, phone_number as "phoneNumber",
            contact_email as "contactEmail", social_links as "socialLinks",
            updated_at as "updatedAt"
        `;
        
        const result = await pool.query(query, queryParams);
        const updatedProfile = result.rows[0];
        
        // Parse JSON fields
        if (updatedProfile.socialLinks) {
          updatedProfile.socialLinks = typeof updatedProfile.socialLinks === 'string' 
            ? JSON.parse(updatedProfile.socialLinks) 
            : updatedProfile.socialLinks;
        }
        
        profileLogger.info(`Updated profile for user ${userId}`);
        return updatedProfile;
      } else {
        // Create new profile
        const query = `
          INSERT INTO user_profiles (
            user_id, first_name, last_name, display_name, avatar, bio,
            job_title, organization, department, location, timezone,
            phone_number, contact_email, social_links, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
          RETURNING 
            user_id as "userId", first_name as "firstName", last_name as "lastName",
            display_name as "displayName", avatar, bio, job_title as "jobTitle",
            organization, department, location, timezone, phone_number as "phoneNumber",
            contact_email as "contactEmail", social_links as "socialLinks",
            updated_at as "updatedAt"
        `;
        
        const result = await pool.query(query, [
          userId,
          profileData.firstName || null,
          profileData.lastName || null,
          profileData.displayName || null,
          profileData.avatar || null,
          profileData.bio || null,
          profileData.jobTitle || null,
          profileData.organization || null,
          profileData.department || null,
          profileData.location || null,
          profileData.timezone || null,
          profileData.phoneNumber || null,
          profileData.contactEmail || null,
          socialLinksJson
        ]);
        
        const newProfile = result.rows[0];
        
        // Parse JSON fields
        if (newProfile.socialLinks) {
          newProfile.socialLinks = typeof newProfile.socialLinks === 'string' 
            ? JSON.parse(newProfile.socialLinks) 
            : newProfile.socialLinks;
        }
        
        profileLogger.info(`Created profile for user ${userId}`);
        return newProfile;
      }
    } catch (error) {
      profileLogger.error(`Error updating profile for user ${userId}: ${(error as Error).message}`);
      throw new Error(`Failed to update profile: ${(error as Error).message}`);
    }
  }

  /**
   * Delete user profile
   */
  static async deleteProfile(userId: number): Promise<boolean> {
    try {
      // First verify user exists
      const user = await UserService.getUserById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      // Delete profile
      const result = await pool.query(
        `DELETE FROM user_profiles WHERE user_id = $1`,
        [userId]
      );
      
      profileLogger.info(`Deleted profile for user ${userId}`);
      return result.rowCount > 0;
    } catch (error) {
      profileLogger.error(`Error deleting profile for user ${userId}: ${(error as Error).message}`);
      throw error;
    }
  }
}

export default ProfileService;