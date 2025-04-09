// src/utils/api-health.ts - Revised version
import apiClient from '../api/index';
import { addToast } from '../store/slices/uiSlice';
import { store } from '../store';
import { getToken } from '../utils/auth.utils';

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
    // 1. Always check main API health (public endpoint)
    const mainApiResult = await checkMainApiHealth();
    results.push(mainApiResult);
    
    // Only perform authenticated checks if a token exists
    if (token) {
      try {
        // 2. Check authentication service
        const authResult = await checkAuthService();
        results.push(authResult);
        
        // 3. Check database service (authenticated)
        const dbResult = await checkDatabaseService();
        results.push(dbResult);
      } catch (authError) {
        console.error('Authentication-related health checks failed:', authError);
        // Non-critical, continue without failing
      }
    }
    
    // Notify user about any issues
    const unhealthy = results.filter(r => r.status === 'unhealthy');
    if (unhealthy.length > 0) {
      store.dispatch(addToast({
        type: 'warning',
        message: `${unhealthy.length} services are currently unavailable. Some features may not work properly.`,
        duration: 8000
      }));
    }
    
    return results;
  } catch (error) {
    console.error('Error performing health checks:', error);
    
    // Notify user about connectivity issues
    store.dispatch(addToast({
      type: 'error',
      message: 'Unable to connect to the server. Please check your connection.',
      duration: 8000
    }));
    
    return [{
      service: 'API',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    }];
  }
};

/**
 * Check the main API health (public endpoint)
 */
const checkMainApiHealth = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  try {
    // Use a simple public endpoint that doesn't require auth
    const response = await apiClient.get('/status', { timeout: 5000 });
    const latency = Date.now() - startTime;
    
    return {
      service: 'API',
      status: response.data.success ? 'healthy' : 'unhealthy',
      message: response.data.message || 'API service checked',
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
  try {
    // Use a proper authenticated endpoint
    const response = await apiClient.get('/users/profile', { timeout: 5000 });
    const latency = Date.now() - startTime;
    
    return {
      service: 'Authentication',
      status: response.data.success ? 'healthy' : 'unhealthy',
      message: 'Authentication service checked',
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
  try {
    // This endpoint requires authentication
    const response = await apiClient.get('/database/connections', { timeout: 5000 });
    const latency = Date.now() - startTime;
    
    return {
      service: 'Database',
      status: response.data.success ? 'healthy' : 'unhealthy',
      message: response.data.message || 'Database service checked',
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