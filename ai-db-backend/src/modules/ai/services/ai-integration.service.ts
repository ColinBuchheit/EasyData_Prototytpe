// src/modules/query/services/ai-integration.service.ts

import axios from "axios";
import { createContextLogger } from "../../../config/logger";
import { AIQueryRequest, AIQueryResponse } from '../../query/models/query.model';
import { ConnectionsService } from "../../database/services/connections.service";
import { SchemaService } from "../../database/services/schema.service";
import { getRedisClient } from "../../../config/redis";

const aiIntegrationLogger = createContextLogger("AIIntegrationService");
const AI_AGENT_URL = process.env.AI_AGENT_URL || "http://ai-agent-network:5001";
const AI_API_KEY = process.env.AI_API_KEY || "";
const REQUEST_TIMEOUT = 60000; // 60 seconds
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

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
      const response = await axios.post(
        `${AI_AGENT_URL}/api/v1/run`,
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
      if (attempts <= 1) {
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
      const response = await axios.get(
        `${AI_AGENT_URL}/api/v1/health`,
        { 
          timeout: 5000,
          headers: { 'Authorization': `Bearer ${AI_API_KEY}` }
        }
      );
      
      return response.data?.status === 'ok';
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