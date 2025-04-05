// src/utils/api-health.ts
import apiClient from '../api/index';
import { addToast } from '../store/slices/uiSlice';
import { store } from '../store';

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
  
  try {
    // 1. Check main API health
    const mainApiResult = await checkMainApiHealth();
    results.push(mainApiResult);
    
    // 2. Check authentication service
    const authResult = await checkAuthService();
    results.push(authResult);
    
    // 3. Check database service
    const dbResult = await checkDatabaseService();
    results.push(dbResult);
    
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
 * Check the main API health
 */
const checkMainApiHealth = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  try {
    const response = await apiClient.get('/health', { timeout: 5000 });
    const latency = Date.now() - startTime;
    
    return {
      service: 'API',
      status: response.data.status === 'available' ? 'healthy' : 'unhealthy',
      message: response.data.message,
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
    const response = await apiClient.get('/auth/health', { timeout: 5000 });
    const latency = Date.now() - startTime;
    
    return {
      service: 'Authentication',
      status: response.data.status === 'available' ? 'healthy' : 'unhealthy',
      message: response.data.message,
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
 * Check the database service
 */
const checkDatabaseService = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  try {
    const response = await apiClient.get('/database/health/connections', { timeout: 5000 });
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