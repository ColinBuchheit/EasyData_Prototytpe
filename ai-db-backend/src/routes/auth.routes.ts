import rateLimit from "express-rate-limit";
import { 
  login, 
  register, 
  refreshToken, 
  logout, 
  resetPassword
} from "../controllers/auth.controller";  // ✅ Auth-related functions remain

import { 
  getUserProfile, 
  updateUserPassword 
} from "../controllers/user.controller";  // ✅ Moved user-related functions
import { verifyToken } from "../middleware/auth";
import { Router } from "express";



const router = Router();

/**
 * ✅ Rate limiter for login to prevent brute-force attacks
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  keyGenerator: (req) => {
    const ip = req.headers["x-forwarded-for"] || req.ip;
    return typeof ip === "string" ? ip : (Array.isArray(ip) ? ip[0] : "unknown"); // ✅ Fixes TypeScript issue
  },
  handler: (req, res) => res.status(429).json({ error: "❌ Too many login attempts. Try again later." }),
});

/**
 * ✅ Rate limiter for registration to prevent spam
 */
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 3,
  message: { error: "❌ Too many registration attempts. Try again later." },
});

/**
 * ✅ Auth Routes
 */
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/refresh-token", refreshToken);
router.post("/logout", verifyToken, logout);
router.get("/profile", verifyToken, getUserProfile);
router.post("/change-password", verifyToken, updateUserPassword);
router.post("/reset-password", resetPassword);
export default router;
