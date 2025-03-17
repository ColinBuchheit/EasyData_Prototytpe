import { pool } from "../config/db";
import logger from "../config/logger";

/**
 * ✅ Get Query Analytics
 * 🔹 Tracks total queries, avg response time, and error rate
 */
export async function getQueryAnalytics(userId?: number) {
    try {
      const query = `
        SELECT user_id, COUNT(*) AS total_queries
        FROM conversation
        ${userId ? "WHERE user_id = $1" : ""}
        GROUP BY user_id
        ORDER BY total_queries DESC;
      `;
  
      const params = userId ? [userId] : [];
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(`❌ Error fetching query analytics: ${(error as Error).message}`);
      throw new Error("Failed to retrieve query analytics.");
    }
  }

/**
 * ✅ Get AI Agent Performance Analytics
 * 🔹 Tracks processing time & failure rate per agent
 */
export async function getAgentPerformance(agentName?: string) {
    try {
      const query = `
        SELECT agent_name, COUNT(*) AS total_responses, AVG(response_time) AS avg_response_time
        FROM analytics
        ${agentName ? "WHERE agent_name = $1" : ""}
        GROUP BY agent_name
        ORDER BY total_responses DESC;
      `;
  
      const params = agentName ? [agentName] : [];
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(`❌ Error fetching agent performance data: ${(error as Error).message}`);
      throw new Error("Failed to retrieve agent performance data.");
    }
  }

/**
 * ✅ Get User Engagement Analytics
 * 🔹 Tracks session count, most common queries
 */
export async function getUserEngagement(userId?: number) {
    try {
      const query = `
        SELECT user_id, COUNT(*) AS session_count
        FROM conversation
        ${userId ? "WHERE user_id = $1" : ""}
        GROUP BY user_id
        ORDER BY session_count DESC;
      `;
  
      const params = userId ? [userId] : [];
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(`❌ Error fetching user engagement data: ${(error as Error).message}`);
      throw new Error("Failed to retrieve user engagement data.");
    }
  }

/**
 * ✅ Get Security Metrics
 * 🔹 Tracks rejected queries, flagged security risks
 */
export async function getSecurityMetrics(userId?: number) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS flagged_queries, 
              COUNT(DISTINCT query_id) AS unique_security_events
       FROM agent_logs
       WHERE security_flag = true
       ${userId ? "AND user_id = $1" : ""}`,
      userId ? [userId] : []
    );
    return result.rows[0] || { flagged_queries: 0, unique_security_events: 0 };
  } catch (error) {
    logger.error(`❌ Error fetching security metrics: ${(error as Error).message}`);
    throw new Error("Failed to fetch security metrics.");
  }
}
