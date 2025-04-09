// src/app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import logger from "./config/logger";
import { globalErrorHandler } from "./shared/utils/errorHandler";

// Import Routes from modules
import authRoutes from "./modules/auth/routes";
import databaseRoutes from "./modules/database/routes";
import queryRoutes from "./modules/query/routes";
import analyticsRoutes from "./modules/analytics/routes";
import userRoutes from "./modules/user/routes";
import { checkOverallHealth } from "./modules/ai/controller/health.controller";


// Load environment variables
dotenv.config();

// Initialize Express App
const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// API Routes
app.get("/", checkOverallHealth);
app.use("/api/auth", authRoutes);
app.use("/api/database", databaseRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);

app.get("/health", (req, res) => {
  res.json({ 
    success: true,
    status: "available",
    message: "🚀 API is running successfully!",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development"
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
    error: "NOT_FOUND",
    statusCode: 404,
    path: req.originalUrl
  });
});

// Global error handling middleware
app.use(globalErrorHandler);


export default app;