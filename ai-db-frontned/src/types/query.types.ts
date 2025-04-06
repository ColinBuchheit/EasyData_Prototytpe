// src/types/query.types.ts
export enum QueryStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  STREAMING = 'streaming', // Added for real-time updates
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

// New types for progress updates
export enum ProgressUpdateType {
  THINKING = 'thinking',      // AI thought process
  SCHEMA_ANALYSIS = 'schema_analysis', // DB schema analysis
  QUERY_GENERATION = 'query_generation', // SQL generation
  QUERY_EXECUTION = 'query_execution', // Query running
  RESULT_ANALYSIS = 'result_analysis', // Analyzing results
  VISUALIZATION = 'visualization', // Creating visualizations
  DECISION = 'decision',      // AI making a decision
  ERROR = 'error'             // Error during processing
}

export interface ProgressUpdate {
  type: ProgressUpdateType;
  message: string;
  timestamp: string;
  details?: any;
}

export interface QueryResult {
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
  progressUpdates?: ProgressUpdate[]; // Add progress updates to results
}

export interface QueryResponse extends QueryResult {
  // QueryResponse extends QueryResult with possibly additional fields
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
  progressUpdates: ProgressUpdate[]; // Add to hold streaming updates
  lastError: string | null;
  loading: boolean;
}
