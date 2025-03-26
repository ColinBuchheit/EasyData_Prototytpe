// src/config/env.ts
import path from "path";
import logger from "./logger";
import { createContextLogger } from "./logger";

const envLogger = createContextLogger("Environment");

// List required environment variables
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

// Collect and Log Missing Env Vars
const missingVars = REQUIRED_ENV_VARS.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  envLogger.error(`Missing critical environment variables: ${missingVars.join(", ")}. Application cannot start.`);
  
  // In development, allow startup with warnings
  if (process.env.NODE_ENV === 'development') {
    envLogger.warn("Starting in development mode with missing environment variables. Using defaults where possible.");
  } else {
    process.exit(1);
  }
}

// Helper Function for Safe Env Retrieval
const getEnvVar = (key: string, defaultValue?: string, required = true): string => {
  const value = process.env[key];
  if (!value && required && !defaultValue) {
    envLogger.error(`Missing required environment variable: ${key}`);
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    }
  }
  return value || defaultValue || "";
};

// Export ENV variables with Defaults
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: getEnvVar("JWT_SECRET", "dev-secret-key-change-in-production"),
  JWT_EXPIRES_IN: getEnvVar("JWT_EXPIRES_IN", "1h", false),
  ENCRYPTION_KEY: getEnvVar("ENCRYPTION_KEY", "dev-encryption-key-change-in-production"),
  
  // Database
  DB_HOST: getEnvVar("DB_HOST", "localhost"),
  DB_PORT: Number(process.env.DB_PORT) || 5432,
  DB_USER: getEnvVar("DB_USER", "postgres"),
  DB_PASSWORD: getEnvVar("DB_PASSWORD", "postgres"),
  DB_DATABASE: getEnvVar("DB_DATABASE", "easydata"),
  DB_TYPE: getEnvVar("DB_TYPE", "postgres"),
  
  // Redis
  REDIS_URL: getEnvVar("REDIS_URL", "redis://localhost:6379", false),
  
  // External APIs
  AI_AGENT_API: getEnvVar("AI_AGENT_API", "http://localhost:5001", false),
  AI_API_KEY: getEnvVar("AI_API_KEY", "", false),
  BACKEND_SECRET: getEnvVar("BACKEND_SECRET", "backend-secret-change-in-production"),
  
  // CORS & Security
  CORS_ORIGIN: getEnvVar("CORS_ORIGIN", "*", false),
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // API URLs
  API_URL: getEnvVar("API_URL", "http://localhost:3000", false),
  PROD_API_URL: getEnvVar("PROD_API_URL", "https://api.easydata.com", false),
  STAGING_API_URL: getEnvVar("STAGING_API_URL", "https://staging-api.easydata.com", false),
  
  // Logging
  LOG_LEVEL: getEnvVar("LOG_LEVEL", "info", false),
  LOG_FORMAT: getEnvVar("LOG_FORMAT", "combined", false),
  
  // MongoDB
  MONGO_URI: getEnvVar("MONGO_URI", "mongodb://localhost:27017/easydata", false),
};

// Log the environment configuration in development
if (ENV.NODE_ENV === 'development') {
  envLogger.info("Environment configuration loaded:");
  const safeEnv = { ...ENV };
  delete safeEnv.JWT_SECRET;
  delete safeEnv.ENCRYPTION_KEY;
  delete safeEnv.DB_PASSWORD;
  delete safeEnv.AI_API_KEY;
  delete safeEnv.BACKEND_SECRET;
  console.log(safeEnv);
}