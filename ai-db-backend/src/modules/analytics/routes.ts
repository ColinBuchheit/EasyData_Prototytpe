// src/modules/analytics/routes.ts

import { Router } from "express";
import { verifyTokenMiddleware } from "../../auth/middleware/verification.middleware";
import { requireRole } from "../../auth/middleware/rbac.middleware";

// Import controllers
import {
  getActiveUsers,
  getTotalQueries,
  getUserQueryActivity,
  getMostUsedDatabases,
  getUsageReport,
  trackUserAction
} from "./controllers/usage.controller";

import {
  getAverageQueryTime,
  getSlowestQueries,
  getDatabasePerformance,
  getExecutionTimeTrend,
  getAIResponseTimes,
  getPerformanceReport,
  trackQueryPerformance
} from "./controllers/performance.controller";

import {
  getSecurityEventsByType,
  getSecurityEventsBySeverity,
  getTopSources,
  getSecurityEventsTrend,
  getSecurityReport,
  resolveSecurityEvent,
  trackSecurityEvent
} from "./controllers/security.controller";

import {
  getAdminDashboard,
  getUserDashboard,
  compareMetrics
} from "./controllers/dashboard.controller";

const router = Router();

// ==============================
// Usage Analytics Routes
// ==============================
router.get("/usage/active-users", verifyTokenMiddleware, requireRole(["admin"]), getActiveUsers);
router.get("/usage/total-queries", verifyTokenMiddleware, getTotalQueries);
router.get("/usage/user-activity", verifyTokenMiddleware, getUserQueryActivity);
router.get("/usage/databases", verifyTokenMiddleware, getMostUsedDatabases);
router.get("/usage/report", verifyTokenMiddleware, requireRole(["admin"]), getUsageReport);
router.post("/usage/track", verifyTokenMiddleware, trackUserAction);

// ==============================
// Performance Analytics Routes
// ==============================
router.get("/performance/avg-time", verifyTokenMiddleware, getAverageQueryTime);
router.get("/performance/slowest-queries", verifyTokenMiddleware, requireRole(["admin"]), getSlowestQueries);
router.get("/performance/databases", verifyTokenMiddleware, getDatabasePerformance);
router.get("/performance/trends", verifyTokenMiddleware, getExecutionTimeTrend);
router.get("/performance/ai-response", verifyTokenMiddleware, getAIResponseTimes);
router.get("/performance/report", verifyTokenMiddleware, requireRole(["admin"]), getPerformanceReport);
router.post("/performance/track", verifyTokenMiddleware, trackQueryPerformance);

// ==============================
// Security Analytics Routes
// ==============================
router.get("/security/events-by-type", verifyTokenMiddleware, requireRole(["admin"]), getSecurityEventsByType);
router.get("/security/events-by-severity", verifyTokenMiddleware, requireRole(["admin"]), getSecurityEventsBySeverity);
router.get("/security/top-sources", verifyTokenMiddleware, requireRole(["admin"]), getTopSources);
router.get("/security/trends", verifyTokenMiddleware, requireRole(["admin"]), getSecurityEventsTrend);
router.get("/security/report", verifyTokenMiddleware, requireRole(["admin"]), getSecurityReport);
router.post("/security/resolve", verifyTokenMiddleware, requireRole(["admin"]), resolveSecurityEvent);
router.post("/security/track", trackSecurityEvent); // No auth middleware, uses internal checks

// ==============================
// Dashboard Routes
// ==============================
router.get("/dashboard/admin", verifyTokenMiddleware, requireRole(["admin"]), getAdminDashboard);
router.get("/dashboard/user", verifyTokenMiddleware, getUserDashboard);
router.get("/dashboard/compare", verifyTokenMiddleware, compareMetrics);

export default router;