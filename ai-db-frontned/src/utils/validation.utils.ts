// src/utils/validation.utils.ts

/**
 * Check if a string is empty or only whitespace
 */
export const isEmpty = (value: string | null | undefined): boolean => {
    return value === null || value === undefined || value.trim() === '';
  };
  
  /**
   * Validate email format
   */
  export const isValidEmail = (email: string): boolean => {
    if (isEmpty(email)) return false;
    
    // Email regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  /**
   * Validate password strength
   */
  export const isValidPassword = (password: string): { valid: boolean; message?: string } => {
    if (isEmpty(password)) {
      return { valid: false, message: 'Password is required' };
    }
    
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    
    return { valid: true };
  };
  
  /**
   * Validate form data object
   */
  export const validateForm = (
    data: Record<string, any>,
    validationRules: Record<string, (value: any) => { valid: boolean; message?: string }>
  ): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    Object.keys(validationRules).forEach(field => {
      const rule = validationRules[field];
      const value = data[field];
      const validation = rule(value);
      
      if (!validation.valid && validation.message) {
        errors[field] = validation.message;
      }
    });
    
    return errors;
  };
  
  /**
   * Validate username format
   */
  export const isValidUsername = (username: string): boolean => {
    if (isEmpty(username)) return false;
    
    // Username should be 3-20 characters and only contain alphanumeric characters, underscores and hyphens
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return usernameRegex.test(username);
  };
  
  /**
   * Validate hex color code
   */
  export const isValidHexColor = (color: string): boolean => {
    if (isEmpty(color)) return false;
    
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
  };
  
  /**
   * Check if a value is within a numerical range
   */
  export const isInRange = (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  };
  
  /**
   * Validate date format (YYYY-MM-DD)
   */
  export const isValidDateFormat = (date: string): boolean => {
    if (isEmpty(date)) return false;
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    // Check if it's a valid date (not just a valid format)
    const d = new Date(date);
    return !isNaN(d.getTime());
  };
  
  /**
   * Validate if object has all required properties
   */
  export const hasRequiredProperties = (obj: any, requiredProps: string[]): boolean => {
    if (!obj) return false;
    
    return requiredProps.every(prop => 
      Object.prototype.hasOwnProperty.call(obj, prop) && 
      obj[prop] !== null && 
      obj[prop] !== undefined
    );
  };
  
  /**
   * Validate if a value exists in an array
   */
  export const isValueInArray = <T>(value: T, array: T[]): boolean => {
    return array.includes(value);
  };
  
  /**
   * Validate query parameters against a schema
   */
  export const validateQueryParams = (
    params: Record<string, any>,
    schema: Record<string, { required?: boolean; type?: string; validator?: (val: any) => boolean }>
  ): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    Object.keys(schema).forEach(param => {
      const { required = false, type, validator } = schema[param];
      const value = params[param];
      
      // Check if required parameter is missing
      if (required && (value === undefined || value === null || value === '')) {
        errors[param] = `${param} is required`;
        return;
      }
      
      // Skip validation if parameter is not provided and not required
      if ((value === undefined || value === null || value === '') && !required) {
        return;
      }
      
      // Check type if specified
      if (type && typeof value !== type) {
        errors[param] = `${param} must be of type ${type}`;
        return;
      }
      
      // Use custom validator if provided
      if (validator && !validator(value)) {
        errors[param] = `${param} is invalid`;
      }
    });
    
    return errors;
  };
  ;
  
  /**
   * Validate URL format
   */
  export const isValidUrl = (url: string): boolean => {
    if (isEmpty(url)) return false;
    
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };
  
  /**
   * Validate numeric input
   */
  export const isValidNumber = (value: string | number): boolean => {
    if (typeof value === 'number') return !isNaN(value);
    if (isEmpty(value)) return false;
    
    return !isNaN(Number(value));
  };
  
  /**
   * Validate integer input
   */
  export const isValidInteger = (value: string | number): boolean => {
    if (!isValidNumber(value)) return false;
    
    const num = Number(value);
    return Number.isInteger(num);
  };
  
  /**
   * Validate port number
   */
  export const isValidPort = (port: string | number): boolean => {
    if (!isValidInteger(port)) return false;
    
    const portNum = Number(port);
    return portNum >= 0 && portNum <= 65535;
  };
  
  /**
   * Validate hostname format
   */
  export const isValidHostname = (hostname: string): boolean => {
    if (isEmpty(hostname)) return false;
    
    // Basic hostname validation
    const hostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
    
    // IP address validation
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // Accept localhost for development
    if (hostname === 'localhost') return true;
    
    return hostnameRegex.test(hostname) || ipRegex.test(hostname);
  };
  
  /**
   * Validate database connection details
   */
  export const validateDatabaseConnection = (
    connection: {
      dbType: string;
      host: string;
      port: string | number;
      username: string;
      password: string;
      dbName: string;
    }
  ): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (isEmpty(connection.dbType)) {
      errors.dbType = 'Database type is required';
    }
    
    if (isEmpty(connection.host)) {
      errors.host = 'Host is required';
    } else if (!isValidHostname(connection.host)) {
      errors.host = 'Invalid hostname or IP address';
    }
    
    if (!isValidPort(connection.port)) {
      errors.port = 'Port must be a valid number between 0 and 65535';
    }
    
    if (isEmpty(connection.username)) {
      errors.username = 'Username is required';
    }
    
    if (isEmpty(connection.password)) {
      errors.password = 'Password is required';
    }
    
    if (isEmpty(connection.dbName)) {
      errors.dbName = 'Database name is required';
    }
    
    return errors;

}