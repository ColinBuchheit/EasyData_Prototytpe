// src/utils/format.utils.ts

/**
 * Format number as currency
 */
export const formatCurrency = (
    value: number,
    currency: string = 'USD',
    locale: string = 'en-US'
  ): string => {
    if (value === null || value === undefined) return '';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(value);
  };
  
  /**
   * Format number with thousands separators
   */
  export const formatNumber = (
    value: number,
    options: Intl.NumberFormatOptions = {},
    locale: string = 'en-US'
  ): string => {
    if (value === null || value === undefined) return '';
    
    return new Intl.NumberFormat(locale, options).format(value);
  };
  
  /**
   * Format percentage
   */
  export const formatPercentage = (
    value: number,
    decimals: number = 2,
    locale: string = 'en-US'
  ): string => {
    if (value === null || value === undefined) return '';
    
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value / 100);
  };
  
  /**
   * Truncate text with ellipsis
   */
  export const truncateText = (text: string, maxLength: number = 100): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return `${text.substring(0, maxLength)}...`;
  };
  
  /**
   * Format file size (bytes to KB, MB, etc.)
   */
  export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  /**
   * Convert camelCase to Title Case
   */
  export const camelToTitleCase = (camelCase: string): string => {
    if (!camelCase) return '';
    
    const result = camelCase.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  };
  
  /**
   * Format SQL query with proper indentation
   */
  export const formatSqlQuery = (query: string): string => {
    if (!query) return '';
    
    // Basic SQL formatting - for a real implementation, consider using a library
    return query
      .replace(/\s+/g, ' ')
      .replace(/ (SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|UNION|INSERT INTO|UPDATE|DELETE FROM)/gi, '\n$1')
      .replace(/ (AND|OR)/gi, '\n  $1');
  };
  
  /**
   * Format duration in milliseconds to human-readable format
   */
  export const formatDuration = (ms: number): string => {
    if (ms < 1000) {
      return `${ms} ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)} sec`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(2);
      return `${minutes} min ${seconds} sec`;
    }
  };
  
  /**
   * Convert object keys from snake_case to camelCase
   */
  export const toCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(v => toCamelCase(v));
    } else if (obj !== null && obj !== undefined && typeof obj === 'object') {
      return Object.keys(obj).reduce((result, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = toCamelCase(obj[key]);
        return result;
      }, {} as any);
    }
    return obj;
  };
  
  /**
   * Convert object keys from camelCase to snake_case
   */
  export const toSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(v => toSnakeCase(v));
    } else if (obj !== null && obj !== undefined && typeof obj === 'object') {
      return Object.keys(obj).reduce((result, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = toSnakeCase(obj[key]);
        return result;
      }, {} as any);
    }
    return obj;
  };

/**
 * Utility for conditionally joining class names together
 */
export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};
