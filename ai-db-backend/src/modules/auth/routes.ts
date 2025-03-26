// src/modules/auth/routes.ts
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { 
  login, 
  register, 
  refreshTokenHandler, 
  logout, 
  resetPassword,
  changePassword
} from "./controllers/auth.controller";
import { verifyTokenMiddleware } from "./middleware/verification.middleware";

const router = Router();

/**
 * Rate limiter for login to prevent brute-force attacks
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  keyGenerator: (req) => {
    const ip = req.headers["x-forwarded-for"] || req.ip;
    return typeof ip === "string" ? ip : (Array.isArray(ip) ? ip[0] : "unknown");
  },
  handler: (req, res) => res.status(429).json({ 
    success: false, 
    message: "Too many login attempts. Try again later." 
  }),
});

/**
 * Rate limiter for registration to prevent spam
 */
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 3,
  handler: (req, res) => res.status(429).json({ 
    success: false, 
    message: "Too many registration attempts. Try again later." 
  }),
});

/**
 * Auth Routes
 */
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/refresh-token", refreshTokenHandler);
router.post("/logout", verifyTokenMiddleware, logout);
router.post("/reset-password", resetPassword);
router.post("/change-password", verifyTokenMiddleware, changePassword);

export default router;