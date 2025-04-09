// src/routes/health.routes.ts
import { Router, Request, Response } from "express";
import { createContextLogger } from "../config/logger";
import { asyncHandler } from "../shared/utils/errorHandler";
import { pool } from "../config/db";
import { getRedisClient } from "../config/redis";

const router = Router();
const healthLogger = createContextLogger("HealthAPI");

/**
 * Public health check endpoint
 */
router.get("/status", asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    status: "available",
    message: "API is healthy",
    timestamp: new Date().toISOString()
  });
}));

/**
 * API health endpoint
 */
router.get("/api/health", asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    status: "available",
    message: "API is healthy",
    timestamp: new Date().toISOString()
  });
}));

/**
 * Auth service health check
 */
router.get("/api/auth/health", asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    status: "available",
    message: "Auth service is healthy",
    timestamp: new Date().toISOString()
  });
}));

/**
 * Database health check
 */
router.get("/api/database/health", asyncHandler(async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      res.json({
        success: true,
        status: "available",
        message: "Database connection is healthy",
        timestamp: new Date().toISOString()
      });
    } finally {
      client.release();
    }
  } catch (error) {
    healthLogger.error(`Database health check failed: ${(error as Error).message}`);
    res.status(500).json({
      success: false,
      status: "unavailable",
      message: "Database connection failed",
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Redis health check
 */
router.get("/status/redis", asyncHandler(async (req: Request, res: Response) => {
  try {
    const client = await getRedisClient();
    const pingResult = await client.ping();
    res.json({
      success: true,
      status: "available",
      message: "Redis connection is healthy",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    healthLogger.error(`Redis health check failed: ${(error as Error).message}`);
    res.status(500).json({
      success: false,
      status: "unavailable",
      message: "Redis connection failed",
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;