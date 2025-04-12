// src/utils/api-health.ts
import apiClient from '../api/index';
import { addToast } from '../store/slices/uiSlice';
import { store } from '../store';
import { getToken } from './authService';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy';
  message?: string;
  latency?: number;
}

/**
 * Perform health checks for all backend services
 */
export const checkApiHealth = async (): Promise<HealthCheckResult[]> => {
  const results: HealthCheckResult[] = [];
  const startTime = Date.now();
  const token = getToken(); // Check for auth token
  
  try {
    // 1. Check main API health using a more reliable endpoint
    const mainApiResult = await checkMainApiHealth();
    results.push(mainApiResult);
    
    // Only perform authenticated checks if a token exists and main API is healthy
    if (token && mainApiResult.status === 'healthy') {
      try {
        // 2. Check authentication service
        const authResult = await checkAuthService();
        results.push(authResult);
        
        // 3. Check database service (authenticated) - only if auth is working
        if (authResult.status === 'healthy') {
          const dbResult = await checkDatabaseService();
          results.push(dbResult);
        }
      } catch (authError) {
        console.error('Authentication-related health checks failed:', authError);
        // Add failed service with error message
        results.push({
          service: 'Authentication',
          status: 'unhealthy',
          message: authError instanceof Error ? authError.message : 'Authentication check failed',
          latency: Date.now() - startTime
        });
      }
    }
    
    // Notify user about any issues (but only for important issues)
    const unhealthy = results.filter(r => r.status === 'unhealthy');
    if (unhealthy.length > 0 && mainApiResult.status === 'unhealthy') {
      store.dispatch(addToast({
        type: 'warning',
        message: `Unable to connect to the server. Some features may not work properly.`,
        duration: 8000
      }));
    }
    
    return results;
  } catch (error) {
    console.error('Error performing health checks:', error);
    
    // Add a generic error result
    return [{
      service: 'API',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    }];
  }
};

/**
 * Check the main API health
 * Uses a ping endpoint instead of status which may not exist
 */
const checkMainApiHealth = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  try {
    // Try a safe endpoint that should always be available
    // If /api/ping doesn't exist, modify this to use another reliable endpoint
    const response = await apiClient.get('/', { 
      timeout: 5000,
      // Don't throw error on 404
      validateStatus: (status) => status < 500
    });
    
    const latency = Date.now() - startTime;
    
    // Consider any response under 500 as "healthy" for main API check
    // - Even a 404 means the server is responding, which is what we want to verify
    return {
      service: 'API',
      status: response.status < 500 ? 'healthy' : 'unhealthy',
      message: `API responded with status ${response.status}`,
      latency
    };
  } catch (error) {
    return {
      service: 'API',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
};

/**
 * Check the authentication service
 */
const checkAuthService = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  const token = getToken();
  
  // If no token, don't try auth endpoints
  if (!token) {
    return {
      service: 'Authentication',
      status: 'unhealthy',
      message: 'No authentication token available',
      latency: 0
    };
  }
  
  try {
    // Use auth verification endpoint - adjust to your actual endpoint
    const response = await apiClient.get('/auth/verify', {
      timeout: 5000,
      headers: {
        Authorization: `Bearer ${token}`
      },
      // Don't throw on 401 - that's still a valid response
      validateStatus: (status) => status < 500
    });
    
    const latency = Date.now() - startTime;
    
    return {
      service: 'Authentication',
      // Only consider it healthy if we get a 2xx response
      status: response.status >= 200 && response.status < 300 ? 'healthy' : 'unhealthy',
      message: response.status >= 200 && response.status < 300 
        ? 'Authentication service is operational' 
        : `Auth service responded with status ${response.status}`,
      latency
    };
  } catch (error) {
    return {
      service: 'Authentication',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
};

/**
 * Check the database service (requires authentication)
 */
const checkDatabaseService = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  const token = getToken();
  
  // If no token, don't try auth endpoints
  if (!token) {
    return {
      service: 'Database',
      status: 'unhealthy',
      message: 'No authentication token available',
      latency: 0
    };
  }
  
  try {
    // Try to get database connections as a health check
    const response = await apiClient.get('/database/connections', {
      timeout: 5000,
      headers: {
        Authorization: `Bearer ${token}`
      },
      // Don't throw on 401 - that's still a valid response
      validateStatus: (status) => status < 500
    });
    
    const latency = Date.now() - startTime;
    
    return {
      service: 'Database',
      // Only consider it healthy if we get a 2xx response
      status: response.status >= 200 && response.status < 300 ? 'healthy' : 'unhealthy',
      message: response.status >= 200 && response.status < 300 
        ? 'Database service is operational' 
        : `Database service responded with status ${response.status}`,
      latency
    };
  } catch (error) {
    return {
      service: 'Database',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    };
  }
};