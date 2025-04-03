// src/modules/ai/controllers/health.controller.ts

import { Request, Response } from "express";
import axios from "axios";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { createContextLogger } from "../../../config/logger";
import { ENV } from "../../../config/env";

const healthLogger = createContextLogger("AIHealthController");

/**
 * Check if the AI Agent Network is available
 */
export const checkAIAgentHealth = asyncHandler(async (req: Request, res: Response) => {
  try {
    const AI_AGENT_URL = ENV.AI_AGENT_API || 'http://ai-agent-network:5001';
    const response = await axios.get(`${AI_AGENT_URL}/api/v1/health`, {
      timeout: 5000,
      headers: { 'Authorization': `Bearer ${ENV.AI_API_KEY}` }
    });
    
    const isHealthy = response.data.status === 'ok';
    
    healthLogger.info(`AI Agent health check: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
    
    return res.json({
      success: true,
      status: isHealthy ? 'available' : 'unavailable',
      message: isHealthy ? 'AI agent is operational' : 'AI agent is currently unavailable',
      details: response.data
    });
  } catch (error) {
    healthLogger.error(`AI Agent health check failed: ${(error as Error).message}`);
    
    return res.json({
      success: false,
      status: 'unavailable',
      message: 'AI agent is currently unavailable',
      error: (error as Error).message
    });
  }
});

/**
 * Root health check endpoint for the backend that includes AI agent status
 */
export const checkOverallHealth = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Check AI Agent health
    let aiAgentStatus = 'unknown';
    let aiAgentMessage = 'AI agent status unknown';
    
    try {
      const AI_AGENT_URL = ENV.AI_AGENT_API || 'http://ai-agent-network:5001';
      const aiResponse = await axios.get(`${AI_AGENT_URL}/api/v1/health`, {
        timeout: 3000,
        headers: { 'Authorization': `Bearer ${ENV.AI_API_KEY}` }
      });
      
      aiAgentStatus = aiResponse.data.status === 'ok' ? 'available' : 'unavailable';
      aiAgentMessage = aiResponse.data.status === 'ok' ? 'AI agent is operational' : 'AI agent is currently unavailable';
    } catch (error) {
      aiAgentStatus = 'unavailable';
      aiAgentMessage = `AI agent is unavailable: ${(error as Error).message}`;
      healthLogger.warn(`AI Agent health check failed: ${(error as Error).message}`);
    }
    
    // Return overall health status
    return res.json({
      success: true,
      status: 'available',
      services: {
        api: {
          status: 'available',
          message: 'API is operational'
        },
        aiAgent: {
          status: aiAgentStatus,
          message: aiAgentMessage
        }
      },
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date()
    });
  } catch (error) {
    healthLogger.error(`Health check failed: ${(error as Error).message}`);
    
    return res.status(500).json({
      success: false,
      status: 'degraded',
      error: (error as Error).message
    });
  }
});