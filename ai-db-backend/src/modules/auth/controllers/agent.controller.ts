// src/modules/auth/controllers/agent.controller.ts

import { Request, Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { AgentAuthService } from "../services/agent-auth.service";
import { ApiError } from "../../../shared/utils/errorHandler";

const agentLogger = createContextLogger("AgentController");

/**
 * Middleware to verify AI agent requests
 */
export const verifyAgentMiddleware = asyncHandler(async (req: Request, res: Response, next: any) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: "Agent authentication required"
    });
  }
  
  const token = authHeader.split(' ')[1];
  const verificationResult = await AgentAuthService.verifyAgentToken(token);
  
  if (!verificationResult.valid) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired agent token"
    });
  }
  
  // Add agent claims to request
  (req as any).agent = verificationResult.claims;
  
  next();
});

/**
 * Register an AI agent
 */
export const registerAgent = asyncHandler(async (req: Request, res: Response) => {
  const { agent_id, version, capabilities, status } = req.body;
  
  if (!agent_id || !version || !capabilities || !status) {
    throw ApiError.badRequest("Missing required fields (agent_id, version, capabilities, status)");
  }
  
  const result = await AgentAuthService.registerAgent({
    agent_id,
    version,
    capabilities,
    status
  });
  
  if (!result) {
    throw ApiError.serverError("Failed to register agent");
  }
  
  res.json({
    success: true,
    message: "Agent registered successfully"
  });
});

/**
 * Get AI agent details
 */
export const getAgentDetails = asyncHandler(async (req: Request, res: Response) => {
  const agentId = req.params.agentId;
  
  if (!agentId) {
    throw ApiError.badRequest("Agent ID is required");
  }
  
  const agent = await AgentAuthService.getAgentDetails(agentId);
  
  if (!agent) {
    throw ApiError.notFound(`Agent ${agentId} not found`);
  }
  
  res.json({
    success: true,
    data: agent
  });
});

/**
 * List all registered AI agents
 */
export const listAgents = asyncHandler(async (req: Request, res: Response) => {
  const agents = await AgentAuthService.listAgents();
  
  res.json({
    success: true,
    data: agents
  });
});

/**
 * Update AI agent status
 */
export const updateAgentStatus = asyncHandler(async (req: Request, res: Response) => {
  const agentId = req.params.agentId;
  const { status } = req.body;
  
  if (!agentId) {
    throw ApiError.badRequest("Agent ID is required");
  }
  
  if (!status) {
    throw ApiError.badRequest("Status is required");
  }
  
  const result = await AgentAuthService.updateAgentStatus(agentId, status);
  
  if (!result) {
    throw ApiError.notFound(`Agent ${agentId} not found`);
  }
  
  res.json({
    success: true,
    message: `Agent ${agentId} status updated to ${status}`
  });
});