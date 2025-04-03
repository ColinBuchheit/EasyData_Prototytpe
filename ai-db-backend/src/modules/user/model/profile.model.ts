// src/modules/user/models/profile.model.ts

export interface UserProfile {
    userId: number;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    avatar?: string;
    bio?: string;
    jobTitle?: string;
    organization?: string;
    department?: string;
    location?: string;
    timezone?: string;
    phoneNumber?: string;
    contactEmail?: string;
    socialLinks?: {
      linkedIn?: string;
      twitter?: string;
      github?: string;
      website?: string;
    };
    updatedAt: Date;
  }
  
  export interface ProfileUpdateData {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    avatar?: string;
    bio?: string;
    jobTitle?: string;
    organization?: string;
    department?: string;
    location?: string;
    timezone?: string;
    phoneNumber?: string;
    contactEmail?: string;
    socialLinks?: {
      linkedIn?: string;
      twitter?: string;
      github?: string;
      website?: string;
    };
  }