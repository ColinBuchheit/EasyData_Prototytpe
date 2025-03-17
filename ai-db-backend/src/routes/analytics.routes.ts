import { Router } from "express";
import {
  getQueryAnalyticsController,
  getAgentPerformanceController,
  getUserEngagementController,
  getSecurityMetricsController,
} from "../controllers/analytics.controller";
import { verifyToken, requireRole } from "../middleware/auth";

const router = Router();

/**
 * ✅ Query Performance Analytics
 * 🔹 (Requires authentication)
 */
router.get("/queries", verifyToken, getQueryAnalyticsController);

/**
 * ✅ AI Agent Performance Analytics
 * 🔹 (Requires authentication)
 */
router.get("/agents", verifyToken, requireRole(["admin"]), getAgentPerformanceController);

/**
 * ✅ User Engagement Analytics
 * 🔹 (Requires authentication)
 */
router.get("/users", verifyToken, requireRole(["admin"]), getUserEngagementController);

/**
 * ✅ Security & Validation Metrics
 * 🔹 (Requires admin privileges)
 */
router.get("/security", verifyToken, requireRole(["admin"]), getSecurityMetricsController);

export default router;
