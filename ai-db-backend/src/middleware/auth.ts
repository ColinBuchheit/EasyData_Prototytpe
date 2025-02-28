// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const JWT_SECRET = process.env.JWT_SECRET;
const BACKEND_SECRET = process.env.BACKEND_SECRET;

if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not set in environment variables!");
}

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Middleware to verify JWT token for authenticated routes
 */
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      res.status(401).json({ message: "❌ No token provided" });
      return; // ✅ Fix: Ensure function exits
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "❌ Invalid token format" });
      return; // ✅ Fix: Ensure function exits
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        res.status(401).json({ message: "❌ Unauthorized: Invalid token" });
        return; // ✅ Fix: Ensure function exits
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("⚠️ Error verifying token:", error);
    res.status(500).json({ message: "⚠️ Internal server error" });
    return; // ✅ Fix: Ensure function exits
  }
};

/**
 * Middleware to enforce role-based access (RBAC)
 */
export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ message: "❌ Forbidden: Insufficient permissions" });
      return; // ✅ Fix: Ensure function exits
    }
    next();
  };
};

/**
 * Middleware to verify backend-to-AI-Agent communication using `BACKEND_SECRET`
 */
export const verifyBackendRequest = (req: Request, res: Response, next: NextFunction): void => {
  const requestSecret = req.headers["request_secret"];
  
  if (requestSecret !== BACKEND_SECRET) {
    res.status(403).json({ message: "❌ Unauthorized: Backend secret invalid" });
    return; // ✅ Fix: Ensure function exits
  }

  next();
};
