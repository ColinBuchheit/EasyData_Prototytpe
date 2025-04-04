// src/utils/query.utils.ts
import { DatabaseType } from '../types/database.types.';

/**
 * Extract tables from SQL query
 */
export const extractTablesFromQuery = (query: string): string[] => {
  if (!query) return [];
  
  // Extract tables from FROM and JOIN clauses
  const regex = /\bFROM\s+([a-zA-Z0-9_]+)|\bJOIN\s+([a-zA-Z0-9_]+)/gi;
  const tables: string[] = [];
  let match;
  
  while ((match = regex.exec(query)) !== null) {
    // Match will have either the FROM table (match[1]) or JOIN table (match[2])
    const tableName = match[1] || match[2];
    if (tableName && !tables.includes(tableName)) {
      tables.push(tableName);
    }
  }
  
  return tables;
};

/**
 * Validate SQL query syntax (basic validation)
 */
export const validateQuerySyntax = (query: string): boolean => {
  if (!query) return false;
  
  // Basic validation - check for balanced parentheses and semicolons
  const hasBalancedParentheses = (str: string): boolean => {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '(') count++;
      if (str[i] === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  };
  
  // Check for semicolons in the middle of the query (potential SQL injection)
  const hasMidQuerySemicolons = (str: string): boolean => {
    const trimmed = str.trim();
    if (trimmed.length === 0) return false;
    
    // It's OK to have a semicolon at the end
    if (trimmed[trimmed.length - 1] === ';') {
      return trimmed.lastIndexOf(';') !== trimmed.length - 1;
    }
    
    return trimmed.includes(';');
  };
  
  // Start with basic checks
  if (!hasBalancedParentheses(query)) return false;
  if (hasMidQuerySemicolons(query)) return false;
  
  return true;
};

/**
 * Detect if query is a SELECT query
 */
export const isSelectQuery = (query: string): boolean => {
  if (!query) return false;
  return /^\s*SELECT\b/i.test(query.trim());
};

/**
 * Sanitize query input - remove potential harmful SQL
 */
export const sanitizeQuery = (query: string): string => {
  if (!query) return '';
  
  // Remove multiple semicolons, comments, etc.
  return query
    .replace(/;+/g, ';') // Replace multiple semicolons with a single one
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ style comments
    .replace(/--.*$/gm, '') // Remove -- style comments
    .trim();
};

/**
 * Format query response data for visualization
 */
export const prepareDataForVisualization = (data: any[]): any => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { empty: true };
  }
  
  // Analyze the data to determine if it's suitable for charting
  const firstRow = data[0];
  const keys = Object.keys(firstRow);
  
  // Check if data has numeric values that can be aggregated
  const hasNumericValues = keys.some(key => {
    return data.some(row => typeof row[key] === 'number');
  });
  
  // Check if data has date/time values
  const hasDateValues = keys.some(key => {
    return data.some(row => {
      const value = row[key];
      return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
    });
  });
  
  return {
    empty: false,
    rowCount: data.length,
    columns: keys,
    hasNumericValues,
    hasDateValues,
    sampleData: data.slice(0, 5) // First 5 rows for preview
  };
};

/**
 * Generate sample query for a given database type
 */
export const generateSampleQuery = (dbType: DatabaseType, tableName: string = 'users'): string => {
  switch (dbType) {
    case 'postgres':
    case 'mysql':
    case 'mssql':
      return `SELECT * FROM ${tableName} LIMIT 10;`;
    case 'sqlite':
      return `SELECT * FROM ${tableName} LIMIT 10;`;
    case 'mongodb':
      return `{ "collection": "${tableName}", "limit": 10 }`;
    case 'firebase':
      return `{ "collection": "${tableName}", "limit": 10 }`;
    case 'couchdb':
      return `{ "selector": {}, "limit": 10 }`;
    case 'dynamodb':
      return `{ "TableName": "${tableName}", "Limit": 10 }`;
    default:
      return `SELECT * FROM ${tableName} LIMIT 10;`;
  }
};

/**
 * Estimate query execution time based on table size and complexity
 */
export const estimateQueryTime = (query: string, rowCount: number = 1000): number => {
  // This is a very simplistic model - real query time depends on many factors
  let complexity = 1;
  
  // Check for JOINs
  const joinCount = (query.match(/\bJOIN\b/gi) || []).length;
  complexity += joinCount * 1.5;
  
  // Check for aggregations
  if (/\b(COUNT|SUM|AVG|MIN|MAX)\b/i.test(query)) {
    complexity += 1.2;
  }
  
  // Check for WHERE clauses
  if (/\bWHERE\b/i.test(query)) {
    complexity += 0.5;
  }
  
  // Check for GROUP BY
  if (/\bGROUP BY\b/i.test(query)) {
    complexity += 1.3;
  }
  
  // Check for ORDER BY
  if (/\bORDER BY\b/i.test(query)) {
    complexity += 0.7;
  }
  
  // Very simple estimation formula
  // Time in ms = complexity factor * log(row count) * 10
  return Math.ceil(complexity * Math.log(rowCount) * 10);
};

/**
 * Detect database type from query syntax
 */
export const detectDbTypeFromQuery = (query: string): DatabaseType | null => {
  if (!query) return null;
  
  const q = query.toLowerCase();
  
  // MongoDB-style JSON query
  if (q.includes('"collection"') || q.includes('"selector"')) {
    return 'mongodb';
  }
  
  // DynamoDB-style JSON query
  if (q.includes('"tablename"') || q.includes('"keyexpression"')) {
    return 'dynamodb';
  }
  
  // CouchDB-style query
  if (q.includes('"selector"') && q.includes('"fields"')) {
    return 'couchdb';
  }
  
  // Firebase-style query
  if (q.includes('"collection"') && (q.includes('"where"') || q.includes('"limit"'))) {
    return 'firebase';
  }
  
  // Assume SQL for everything else
  return 'postgres'; // Generic SQL default
};