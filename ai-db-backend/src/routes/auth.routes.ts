// src/routes/auth.routes.ts
import { Router } from "express";
import { login, register } from "../controllers/auth.controller";
import rateLimit from "express-rate-limit";
import logger from "../config/logger";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

// ✅ Rate limiter for login to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  message: { error: "❌ Too many login attempts, please try again later." }
});

// ✅ Rate limiter for `/register` to prevent spam
const registerLimiter = rateLimit({
  windowMs: Number(process.env.REGISTER_RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  max: Number(process.env.REGISTER_RATE_LIMIT_MAX) || 3,
  message: { error: "❌ Too many registrations, please try again later." }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 */
router.post("/register", registerLimiter, async (req, res, next) => {
  try {
    await register(req, res);
    logger.info(`✅ New user registered: ${req.body.username}`);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user and retrieve a JWT token
 *     tags: [Auth]
 */
router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    await login(req, res);
  } catch (error) {
    logger.warn(`❌ Failed login attempt for ${req.body.username}`);
    next(error);
  }
});

export default router;
