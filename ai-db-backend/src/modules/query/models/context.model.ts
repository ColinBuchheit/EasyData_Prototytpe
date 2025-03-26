// src/modules/query/models/context.model.ts

export interface QueryContext {
    userId: number;
    currentDbId: number | null;
    lastSwitchTime: Date;
    recentQueries: {
      dbId: number;
      timestamp: Date;
      query: string;
    }[];
  }
  
  export interface ContextSwitchResult {
    switched: boolean;
    dbId?: number;
    message?: string;
  }
  
  export interface DatabaseMatch {
    dbId: number;
    confidence: number;
    reason: string;
  }