// src/types/user.types.ts
export interface UserProfile {
    preferences: UserProfile | null;
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
    updatedAt: string;
  }
  
  export interface UserProfileUpdateData {
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
  
  export type UserTheme = 'light' | 'dark' | 'system';
  
  export interface UserPreferences {
    userId: number;
    theme?: UserTheme;
    defaultDatabaseId?: number;
    notificationSettings: NotificationSettings;
    dashboardSettings: DashboardSettings;
    uiSettings: UISettings;
    updatedAt: string;
  }
  
  export interface NotificationSettings {
    emailNotifications: boolean;
    queryCompletionAlerts: boolean;
    securityAlerts: boolean;
    performanceAlerts: boolean;
    weeklyDigest: boolean;
  }
  
  export interface DashboardSettings {
    defaultView: 'queries' | 'databases' | 'analytics';
    visibleWidgets: string[];
    widgetPositions?: Record<string, { x: number; y: number; w: number; h: number }>;
  }
  
  export interface UISettings {
    resultsPerPage: number;
    codeHighlightTheme: string;
    timezone: string;
    dateFormat: string;
    language: string;
  }
  
  export interface UserPreferencesUpdateData {
    theme?: UserTheme;
    defaultDatabaseId?: number;
    notificationSettings?: Partial<NotificationSettings>;
    dashboardSettings?: Partial<DashboardSettings>;
    uiSettings?: Partial<UISettings>;
  }
  
  export interface UserState {
    profile: UserProfile | null;
    preferences: UserPreferences | null;
    loading: boolean;
    error: string | null;
  }