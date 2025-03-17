import { Request, Response } from "express";
import {
  getQueryAnalytics,
  getAgentPerformance,
  getUserEngagement,
  getSecurityMetrics,
} from "../services/analytics.service";
import logger from "../config/logger";

/**
 * ✅ Get Query Performance Analytics
 */
export const getQueryAnalyticsController = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.query.user_id ? Number(req.query.user_id) : undefined;
      const analytics = await getQueryAnalytics(userId);
      
      logger.info(`✅ Query Analytics retrieved successfully for ${userId ? `User ID ${userId}` : "all users"}`);
      
      res.json({ success: true, data: analytics });
    } catch (error) {
      logger.error(`❌ Error retrieving query analytics: ${(error as Error).message}`);
      res.status(500).json({ success: false, message: "Error retrieving query analytics" });
    }
  };

/**
 * ✅ Get AI Agent Performance Analytics
 */
export const getAgentPerformanceController = async (req: Request, res: Response): Promise<void> => {
    try {
      const agentName = req.query.agent_name ? String(req.query.agent_name) : undefined;
      const performance = await getAgentPerformance(agentName);
      
      logger.info(`✅ Agent Performance data retrieved for ${agentName ? `Agent: ${agentName}` : "all agents"}`);
      
      res.json({ success: true, data: performance });
    } catch (error) {
      logger.error(`❌ Error retrieving agent performance data: ${(error as Error).message}`);
      res.status(500).json({ success: false, message: "Error retrieving agent performance data" });
    }
  };

/**
 * ✅ Get User Engagement Analytics
 */
export const getUserEngagementController = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.query.user_id ? Number(req.query.user_id) : undefined;
      const engagement = await getUserEngagement(userId);
      
      logger.info(`✅ User Engagement data retrieved for ${userId ? `User ID ${userId}` : "all users"}`);
      
      res.json({ success: true, data: engagement });
    } catch (error) {
      logger.error(`❌ Error retrieving user engagement data: ${(error as Error).message}`);
      res.status(500).json({ success: false, message: "Error retrieving user engagement data" });
    }
  };

/**
 * ✅ Get Security & Validation Metrics
 */
export const getSecurityMetricsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query.user_id ? Number(req.query.user_id) : undefined; // ✅ Fix: Convert `null` to `undefined`
    const analytics = await getSecurityMetrics(userId);
    res.json({ success: true, data: analytics });
  } catch (error) {
    logger.error(`❌ Error retrieving security metrics: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: "Error retrieving security metrics" });
  }
};
