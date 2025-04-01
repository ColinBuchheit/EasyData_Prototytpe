// src/modules/auth/services/agent-auth.service.ts

import { createContextLogger } from "../../../config/logger";
import { getRedisClient } from "../../../config/redis";
import { createHmac } from "crypto";
import { ENV } from "../../../config/env";

const agentAuthLogger = createContextLogger("AgentAuthService");

interface AgentClaims {
  service_id: string;
  timestamp: number;
  exp: number;
}

interface AgentRegistration {
  agent_id: string;
  version: string;
  capabilities: string[];
  status: string;
  last_seen: string;
}

/**
 * Service to handle AI agent authentication and registration
 */
export class AgentAuthService {
  /**
   * Verify an agent token
   */
  static async verifyAgentToken(token: string): Promise<{ valid: boolean; claims?: AgentClaims }> {
    try {
      // Split token into payload and signature
      const [payloadB64, signature] = token.split('.');
      
      if (!payloadB64 || !signature) {
        return { valid: false };
      }
      
      // Verify signature
      const expectedSignature = createHmac('sha256', ENV.BACKEND_SECRET)
        .update(payloadB64)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return { valid: false };
      }
      
      // Decode payload
      const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf-8');
      const claims = JSON.parse(payloadStr) as AgentClaims;
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (claims.exp < now) {
        return { valid: false };
      }
      
      // Check if service ID is registered
      const isRegistered = await this.isAgentRegistered(claims.service_id);
      if (!isRegistered) {
        return { valid: false };
      }
      
      return { valid: true, claims };
    } catch (error) {
      agentAuthLogger.error(`Error validating agent token: ${(error as Error).message}`);
      return { valid: false };
    }
  }
  
  /**
   * Register or update an AI agent
   */
  static async registerAgent(registration: Omit<AgentRegistration, 'last_seen'>): Promise<boolean> {
    try {
      const redisClient = await getRedisClient();
      
      // Create registration with timestamp
      const fullRegistration: AgentRegistration = {
        ...registration,
        last_seen: new Date().toISOString()
      };
      
      // Store in Redis
      await redisClient.set(
        `ai:agent:${registration.agent_id}`,
        JSON.stringify(fullRegistration),
        "EX",
        86400 // 24 hours expiry
      );
      
      agentAuthLogger.info(`AI agent registered: ${registration.agent_id} (${registration.version})`);
      return true;
    } catch (error) {
      agentAuthLogger.error(`Error registering AI agent: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Check if an agent is registered
   */
  static async isAgentRegistered(agentId: string): Promise<boolean> {
    try {
      const redisClient = await getRedisClient();
      const registration = await redisClient.get(`ai:agent:${agentId}`);
      return !!registration;
    } catch (error) {
      agentAuthLogger.error(`Error checking agent registration: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Get AI agent details
   */
  static async getAgentDetails(agentId: string): Promise<AgentRegistration | null> {
    try {
      const redisClient = await getRedisClient();
      const registration = await redisClient.get(`ai:agent:${agentId}`);
      
      if (!registration) {
        return null;
      }
      
      return JSON.parse(registration) as AgentRegistration;
    } catch (error) {
      agentAuthLogger.error(`Error getting agent details: ${(error as Error).message}`);
      return null;
    }
  }
  
  /**
   * List all registered AI agents
   */
  static async listAgents(): Promise<AgentRegistration[]> {
    try {
      const redisClient = await getRedisClient();
      const keys = await redisClient.keys('ai:agent:*');
      
      if (!keys.length) {
        return [];
      }
      
      const registrations: AgentRegistration[] = [];
      
      for (const key of keys) {
        const registration = await redisClient.get(key);
        
        if (registration) {
          registrations.push(JSON.parse(registration) as AgentRegistration);
        }
      }
      
      return registrations;
    } catch (error) {
      agentAuthLogger.error(`Error listing AI agents: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Update agent status
   */
  static async updateAgentStatus(agentId: string, status: string): Promise<boolean> {
    try {
      const agent = await this.getAgentDetails(agentId);
      
      if (!agent) {
        return false;
      }
      
      return await this.registerAgent({
        ...agent,
        status
      });
    } catch (error) {
      agentAuthLogger.error(`Error updating agent status: ${(error as Error).message}`);
      return false;
    }
  }
}

export default AgentAuthService;