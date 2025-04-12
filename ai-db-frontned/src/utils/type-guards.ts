// src/utils/type-guards.ts (new file)

import { DbSchema, DbRelationship, DatabaseTable } from '../types/database.types';
import { QueryContext, QueryHistory } from '../types/query.types';

/**
 * Type guard for DbSchema
 */
export function isDbSchema(obj: any): obj is DbSchema {
  return obj !== null && 
    typeof obj === 'object' &&
    typeof obj.id === 'number' && 
    typeof obj.name === 'string' && 
    Array.isArray(obj.tables);
}

/**
 * Type guard for DatabaseTable
 */
export function isDatabaseTable(obj: any): obj is DatabaseTable {
  return obj !== null &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.columns);
}

/**
 * Type guard for DbRelationship
 */
export function isDbRelationship(obj: any): obj is DbRelationship {
  return obj !== null &&
    typeof obj === 'object' &&
    typeof obj.type === 'string' &&
    obj.source && typeof obj.source === 'object' &&
    obj.target && typeof obj.target === 'object';
}

/**
 * Type guard for QueryContext
 */
export function isQueryContext(obj: any): obj is QueryContext {
  return obj !== null &&
    typeof obj === 'object' &&
    typeof obj.userId === 'number' && 
    (obj.currentDbId === null || typeof obj.currentDbId === 'number') &&
    typeof obj.lastSwitchTime === 'string' &&
    Array.isArray(obj.recentQueries);
}

/**
 * Type guard for QueryHistory
 */
export function isQueryHistory(obj: any): obj is QueryHistory {
  return obj !== null &&
    typeof obj === 'object' &&
    typeof obj.userId === 'number' &&
    typeof obj.dbId === 'number' &&
    typeof obj.queryText === 'string' &&
    typeof obj.timestamp === 'string';
}

/**
 * Safely access properties that might be undefined
 * (Alternative to optional chaining)
 */
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  if (obj == null) {
    return undefined;
  }
  return obj[key];
}