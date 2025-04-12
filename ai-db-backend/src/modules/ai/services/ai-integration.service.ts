// src/modules/ai/services/ai-integration.service.ts

import axios from "axios";
import { createContextLogger } from "../../../config/logger";
import { AIQueryRequest, AIQueryResponse } from '../../query/models/query.model';
import { ConnectionsService } from "../../database/services/connections.service";
import { SchemaService } from "../../database/services/schema.service";
import { getRedisClient } from "../../../config/redis";
import { ENV } from "../../../config/env";

const aiIntegrationLogger = createContextLogger("AIIntegrationService");
const AI_AGENT_URL = ENV.AI_AGENT_API;
const AI_API_KEY = ENV.AI_API_KEY;
const REQUEST_TIMEOUT = 60000; // 60 seconds
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

// Standardize API endpoints
const API_ENDPOINTS = {
  HEALTH: '/api/v1/health',
  PROCESS_QUERY: '/api/v1/process-query',
  RUN: '/api/v1/run',
  VISUALIZE: '/api/v1/visualize'
};

/**
 * Service for centralized integration with AI agent network
 */
export class AIIntegrationService {
  /**
   * Process natural language query through AI agent network
   */
  static async processQuery(request: AIQueryRequest): Promise<AIQueryResponse> {
    try {
      aiIntegrationLogger.info(`Processing query for user ${request.userId} and database ${request.dbId}`);
      
      // Pre-flight health check
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        aiIntegrationLogger.warn(`AI agent is not healthy, aborting query for user ${request.userId}`);
        return {
          success: false,
          error: "AI service is currently unavailable. Please try again later."
        };
      }
      
      // Get DB schema if not provided
      let schema = request.schema;
      if (!schema) {
        schema = await SchemaService.getDbMetadata(request.userId, request.dbId);
      }
      
      // Prepare request for AI agent network
      const aiRequest = {
        task: request.task,
        user_id: request.userId.toString(),
        db_info: {
          id: request.dbId,
          db_type: request.dbType,
          database_name: request.dbName,
          schema: schema
        },
        visualize: request.options?.visualize || true
      };
      
      // Call AI agent network with retry logic
      const response = await this.callWithRetry(aiRequest);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || "AI processing failed"
        };
      }
      
      // Transform AI agent response to our format
      const transformedResponse: AIQueryResponse = {
        success: true,
        query: response.final_output?.query || "",
        explanation: response.final_output?.text || "",
        visualizationCode: response.final_output?.visualization?.chart_code || "",
        agentsCalled: response.agents_called || []
      };
      
      // Cache response for future reference
      await this.cacheQueryResponse(request.userId, request.task, transformedResponse);
      
      return transformedResponse;
    } catch (error) {
      aiIntegrationLogger.error(`Error in AI integration: ${(error as Error).message}`);
      return {
        success: false,
        error: `AI service error: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * Call AI agent network with retry logic
   */
  private static async callWithRetry(request: any, attempts = RETRY_ATTEMPTS): Promise<any> {
    try {
      aiIntegrationLogger.info(`Calling AI agent at ${AI_AGENT_URL}${API_ENDPOINTS.RUN}`);
      
      const response = await axios.post(
        `${AI_AGENT_URL}${API_ENDPOINTS.RUN}`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_API_KEY}`
          },
          timeout: REQUEST_TIMEOUT
        }
      );
      
      return response.data;
    } catch (error) {
      // Check if it's a 404 error specifically
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        aiIntegrationLogger.error(`AI agent endpoint not found: ${AI_AGENT_URL}${API_ENDPOINTS.RUN}`);
        throw new Error(`AI agent endpoint not found: ${AI_AGENT_URL}${API_ENDPOINTS.RUN}. Check API configuration.`);
      }
      
      if (attempts <= 1) {
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          aiIntegrationLogger.error(`AI agent connection refused: ${AI_AGENT_URL}. Is the service running?`);
          throw new Error("AI agent connection refused. Is the service running?");
        }
        
        if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
          aiIntegrationLogger.error(`AI agent request timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
          throw new Error("AI agent request timed out. Please try again with a simpler query.");
        }
        
        throw error;
      }
      
      aiIntegrationLogger.warn(`AI agent request failed, retrying (${attempts-1} attempts left): ${(error as Error).message}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return this.callWithRetry(request, attempts - 1);
    }
  }
  
  /**
   * Cache query response for future reference
   */
  private static async cacheQueryResponse(userId: number, task: string, response: AIQueryResponse): Promise<void> {
    try {
      const redisClient = await getRedisClient();
      const cacheKey = `ai:query:${userId}:${this.hashTask(task)}`;
      
      await redisClient.set(cacheKey, JSON.stringify(response), "EX", 3600); // 1 hour expiry
    } catch (error) {
      aiIntegrationLogger.error(`Error caching query response: ${(error as Error).message}`);
      // Non-critical operation, continue
    }
  }
  
  /**
   * Get cached query response if available
   */
  static async getCachedQueryResponse(userId: number, task: string): Promise<AIQueryResponse | null> {
    try {
      const redisClient = await getRedisClient();
      const cacheKey = `ai:query:${userId}:${this.hashTask(task)}`;
      
      const cachedResponse = await redisClient.get(cacheKey);
      if (!cachedResponse) return null;
      
      return JSON.parse(cachedResponse) as AIQueryResponse;
    } catch (error) {
      aiIntegrationLogger.error(`Error retrieving cached response: ${(error as Error).message}`);
      return null;
    }
  }
  
  /**
   * Create a hash of the task for cache key
   */
  private static hashTask(task: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(task).digest('hex');
  }
  
  /**
   * Check AI agent network health
   */
  static async checkHealth(): Promise<boolean> {
    try {
      aiIntegrationLogger.debug(`Checking AI agent health at ${AI_AGENT_URL}${API_ENDPOINTS.HEALTH}`);
      
      const response = await axios.get(
        `${AI_AGENT_URL}${API_ENDPOINTS.HEALTH}`,
        { 
          timeout: 5000,
          headers: { 'Authorization': `Bearer ${AI_API_KEY}` }
        }
      );
      
      const isHealthy = response.data?.status === 'ok';
      aiIntegrationLogger.info(`AI agent health check result: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      return isHealthy;
    } catch (error) {
      aiIntegrationLogger.error(`AI agent health check failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Execute database query directly
   */
  static async executeQuery(userId: number, dbId: number, query: string): Promise<any> {
    try {
      // Get the database connection
      const connection = await ConnectionsService.getConnectionById(userId, dbId);
      if (!connection) {
        throw new Error(`Database connection with ID ${dbId} not found`);
      }
      
      // Execute the query using the ConnectionsService
      const result = await ConnectionsService.executeQuery(connection, query);
      
      return {
        success: true,
        result,
        message: "Query executed successfully"
      };
    } catch (error) {
      aiIntegrationLogger.error(`Error executing query: ${(error as Error).message}`);
      return {
        success: false,
        error: `Query execution failed: ${(error as Error).message}`
      };
    }
  }
}

export default AIIntegrationService;