// src/modules/query/routes.ts

import { Router } from "express";
import { verifyTokenMiddleware } from "../auth/middleware/verification.middleware";
import * as ws from "ws";

// Import controllers
import {
  executeQuery,
  getQueryHistory,
  getCurrentContext,
  setCurrentContext,
  detectQueryDatabase
} from "./controllers/query.controller";

import {
  processNaturalLanguageQuery,
  checkAIAgentHealth
} from "./controllers/ai-query.controller";

import {
  executeMultiDbQuery,
  getMultiDbQueryHistory
} from "./controllers/multi-db.controller";

const router = Router();

// ==============================
// Standard Query Routes
// ==============================
router.post("/execute", verifyTokenMiddleware, executeQuery);
router.get("/history", verifyTokenMiddleware, getQueryHistory);

// ==============================
// Context Routes
// ==============================
router.get("/context", verifyTokenMiddleware, getCurrentContext);
router.post("/context", verifyTokenMiddleware, setCurrentContext);
router.post("/context/detect", verifyTokenMiddleware, detectQueryDatabase);

// ==============================
// AI Query Routes
// ==============================
router.post("/ai", verifyTokenMiddleware, processNaturalLanguageQuery);
router.get("/ai/health", verifyTokenMiddleware, checkAIAgentHealth);

// ==============================
// Multi-Database Query Routes
// ==============================
router.post("/multi", verifyTokenMiddleware, executeMultiDbQuery);
router.get("/multi/history", verifyTokenMiddleware, getMultiDbQueryHistory);

// Export the router
export default router;