// src/types/query.types.ts
export enum QueryStatus {
    IDLE = 'idle',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed'
  }
  
  export interface QueryRequest {
    dbId: number;
    query: string;
  }
  
  export interface NaturalLanguageQueryRequest {
    dbId?: number;
    task: string;
    visualize?: boolean;
    refresh?: boolean;
  }
  
  export interface QueryResponse {
    success: boolean;
    query?: string;
    explanation?: string;
    results?: any[];
    visualizationCode?: string;
    executionTimeMs?: number;
    rowCount?: number;
    message?: string;
    error?: string;
    agentsCalled?: string[];
    cached?: boolean;
    contextSwitched?: boolean;
    dbId?: number;
  }
  
  export interface QueryHistory {
    id?: string;
    userId: number;
    dbId: number;
    queryText: string;
    executionTimeMs: number;
    rowCount: number;
    timestamp: string;
  }
  
  export interface QueryContext {
    userId: number;
    currentDbId: number | null;
    lastSwitchTime: string;
    recentQueries: {
      dbId: number;
      timestamp: string;
      query: string;
    }[];
  }
  
  export interface Visualization {
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'table' | 'custom';
    data: any;
    options?: any;
    chartCode?: string;
  }
  
  export interface QueryState {
    history: QueryHistory[];
    currentContext: QueryContext | null;
    status: QueryStatus;
    statusMessage?: string;
    lastError: string | null;
    loading: boolean;
  }