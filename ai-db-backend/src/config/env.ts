// src/config/env.ts
import dotenv from "dotenv";
import path from "path";
import { logger } from "./logger"; // ✅ Use centralized logger

// ✅ Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ✅ List required environment variables
const REQUIRED_ENV_VARS = [
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_DATABASE",
  "DB_TYPE",
  "JWT_SECRET",
  "ENCRYPTION_KEY",
  "AI_AGENT_API",
  "AI_API_KEY",
  "BACKEND_SECRET",
];

// ✅ Validate required environment variables
REQUIRED_ENV_VARS.forEach((envVar) => {
  if (!process.env[envVar]) {
    logger.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

// ✅ Export ENV variables with Defaults
export const ENV = {
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: process.env.JWT_SECRET as string,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY as string,
  DB_HOST: process.env.DB_HOST as string,
  DB_PORT: Number(process.env.DB_PORT) || 5432,
  DB_USER: process.env.DB_USER as string,
  DB_PASSWORD: process.env.DB_PASSWORD as string,
  DB_DATABASE: process.env.DB_DATABASE as string,
  DB_TYPE: process.env.DB_TYPE as string, // ✅ Ensuring DB_TYPE is required
  AI_AGENT_API: process.env.AI_AGENT_API || "https://default-ai-api.com", // ✅ Default fallback
  AI_API_KEY: process.env.AI_API_KEY || "", // ✅ Allow empty if not used
  BACKEND_SECRET: process.env.BACKEND_SECRET || "default-secret", // ✅ Default fallback
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*", // ✅ FIX: Added CORS_ORIGIN
  NODE_ENV: process.env.NODE_ENV || "development", // ✅ Added Fix
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379", // ✅ Added Fix
};
