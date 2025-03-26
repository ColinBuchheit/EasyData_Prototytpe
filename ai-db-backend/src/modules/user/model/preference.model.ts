// src/modules/user/models/preference.model.ts

export interface UserPreferences {
    userId: number;
    theme?: UserTheme;
    defaultDatabaseId?: number;
    notificationSettings: NotificationSettings;
    dashboardSettings: DashboardSettings;
    uiSettings: UISettings;
    updatedAt: Date;
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
  
  export type UserTheme = 'light' | 'dark' | 'system';
  
  export interface PreferenceUpdateData {
    theme?: UserTheme;
    defaultDatabaseId?: number;
    notificationSettings?: Partial<NotificationSettings>;
    dashboardSettings?: Partial<DashboardSettings>;
    uiSettings?: Partial<UISettings>;
  }