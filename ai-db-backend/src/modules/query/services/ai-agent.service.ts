// src/modules/query/services/ai-agent.service.ts

import axios from "axios";
import { createContextLogger } from "../../../config/logger";
import { AIQueryRequest, AIQueryResponse } from "../models/query.model";

const aiLogger = createContextLogger("AIAgentService");
const AI_AGENT_URL = process.env.AI_AGENT_API || "http://localhost:5001";
const AI_API_KEY = process.env.AI_API_KEY || "";
const REQUEST_TIMEOUT = 60000; // 60 seconds

/**
 * Service for interacting with AI agents
 */
export class AIAgentService {
  /**
   * Translate natural language to SQL
   */
  static async processNaturalLanguageQuery(request: AIQueryRequest): Promise<AIQueryResponse> {
    try {
      aiLogger.info(`Processing NL query for database ${request.dbId}: ${request.task}`);
      
      // Create proper db_info object as expected by the AI agent
      const response = await axios.post(
        `${AI_AGENT_URL}/api/v1/run`,
        {
          task: request.task,
          user_id: request.userId.toString(),
          db_info: {
            id: request.dbId,
            db_type: request.dbType,
            database_name: request.dbName
          },
          visualize: request.options?.visualize ?? true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_API_KEY}`
          },
          timeout: REQUEST_TIMEOUT
        }
      );
      
      if (!response.data.success) {
        aiLogger.warn(`AI agent failed to process query: ${response.data.error || 'Unknown error'}`);
        return {
          success: false,
          error: response.data.error || "AI failed to generate a valid query."
        };
      }
      
      // Transform AI agent response to structured format
      return {
        success: true,
        query: response.data.final_output?.query || "",
        explanation: response.data.final_output?.text || "",
        visualizationCode: response.data.final_output?.visualization?.chart_code || "",
        agentsCalled: response.data.agents_called || []
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        aiLogger.error(`AI agent request timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
        return {
          success: false,
          error: "Request to AI agent timed out. Please try again with a simpler query."
        };
      }
      
      aiLogger.error(`Error calling AI agent: ${(error as Error).message}`);
      return {
        success: false,
        error: "Failed to communicate with AI agent."
      };
    }
  }
  
  /**
   * Run an AI orchestration operation
   */
  static async runOrchestration(input: any): Promise<any> {
    try {
      aiLogger.info(`Running AI orchestration: ${input.operation || 'default'}`);
      
      // Ensure db_info is properly formatted if present
      if (input.db_info && typeof input.db_info === 'number') {
        // If db_info is just an ID, we need to fetch the full info
        // This is a fallback for backward compatibility
        aiLogger.warn("Converting numeric db_info to proper object format");
        input.db_info = {
          id: input.db_info,
          db_type: input.db_type || "unknown",
          database_name: input.db_name || "database"
        };
      }
      
      const response = await axios.post(
        `${AI_AGENT_URL}/api/v1/run`, 
        input,
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
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        aiLogger.error("AI orchestration timed out");
        return { 
          success: false, 
          error: "AI orchestration operation timed out." 
        };
      }
      
      aiLogger.error(`AI orchestration error: ${(error as Error).message}`);
      return { 
        success: false, 
        error: "Failed to run AI orchestration operation." 
      };
    }
  }
  
  /**
   * Analyze query results and generate visualizations
   */
  static async generateVisualization(data: any[], task: string): Promise<string | null> {
    try {
      aiLogger.info(`Generating visualization for task: ${task}`);
      
      const response = await axios.post(
        `${AI_AGENT_URL}/api/v1/visualize`,
        { data, task },
        { 
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_API_KEY}`
          },
          timeout: REQUEST_TIMEOUT
        }
      );
      
      if (!response.data.success) {
        aiLogger.warn(`Failed to generate visualization: ${response.data.error}`);
        return null;
      }
      
      return response.data.visualizationCode;
    } catch (error) {
      aiLogger.error(`Error generating visualization: ${(error as Error).message}`);
      return null;
    }
  }
  
  /**
   * Health check for AI agent
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
      
      return response.data.status === 'ok';
    } catch (error) {
      aiLogger.error(`AI agent health check failed: ${(error as Error).message}`);
      return false;
    }
  }
}
