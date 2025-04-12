// src/config/env.ts

import path from "path";
import basicLogger from "./basiclogger";

const envLogger = basicLogger;

// List required environment variables
const REQUIRED_ENV_VARS = [
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_DATABASE",
  "DB_TYPE",
  "JWT_SECRET",
  "ENCRYPTION_KEY",
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

// Define the interface for our ENV object with optional fields
interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ENCRYPTION_KEY: string;
  
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_TYPE: string;
  
  REDIS_URL: string;
  
  AI_AGENT_API: string;
  AI_API_KEY: string;
  BACKEND_SECRET: string;
  
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  API_URL: string;
  PROD_API_URL: string;
  STAGING_API_URL: string;
  
  LOG_LEVEL: string;
  LOG_FORMAT: string;
  
  MONGO_URI: string;
  
  // Email and SMTP Configuration
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  DEV_EMAIL_USER: string;
  DEV_EMAIL_PASS: string;
  EMAIL_FROM: string;
  FRONTEND_URL: string;
}

// Export ENV variables with Defaults
export const ENV: EnvConfig = {
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
  
  // External APIs - Updated AI_AGENT_API to support multiple runtime environments
  AI_AGENT_API: getEnvVar("AI_AGENT_API", process.env.NODE_ENV === "production" ? "http://ai-agent-network:5001" : "http://localhost:5001", false),
  AI_API_KEY: getEnvVar("AI_API_KEY", "default-dev-key-change-in-production", false),
  BACKEND_SECRET: getEnvVar("BACKEND_SECRET", "backend-secret-change-in-production"),
  
  // CORS & Security
  CORS_ORIGIN: getEnvVar("CORS_ORIGIN", "*", false),
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // API URLs
  API_URL: getEnvVar("API_URL", "http://localhost:3000", false),
  PROD_API_URL: getEnvVar("PROD_API_URL", "https://api.easydata.com", false),
  STAGING_API_URL: getEnvVar("STAGING_API_URL", "https://staging-api.easydata.com", false),
  FRONTEND_URL: getEnvVar("FRONTEND_URL", "http://localhost:3000", false),
  
  // Logging
  LOG_LEVEL: getEnvVar("LOG_LEVEL", "info", false),
  LOG_FORMAT: getEnvVar("LOG_FORMAT", "combined", false),
  
  // MongoDB
  MONGO_URI: getEnvVar("MONGO_URI", "mongodb://localhost:27017/easydata", false),
  
  // Email and SMTP Configuration
  SMTP_HOST: getEnvVar("SMTP_HOST", "smtp.example.com", false),
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: getEnvVar("SMTP_USER", "", false),
  SMTP_PASSWORD: getEnvVar("SMTP_PASSWORD", "", false),
  DEV_EMAIL_USER: getEnvVar("DEV_EMAIL_USER", "", false),
  DEV_EMAIL_PASS: getEnvVar("DEV_EMAIL_PASS", "", false),
  EMAIL_FROM: getEnvVar("EMAIL_FROM", '"EasyData Support" <support@easydata.com>', false),
};

// Log the environment configuration in development
if (ENV.NODE_ENV === 'development') {
  envLogger.info("Environment configuration loaded:");
  
  // Instead of using delete, create a new object with only the keys we want to log
  const safeEnv = {
    NODE_ENV: ENV.NODE_ENV,
    PORT: ENV.PORT,
    DB_HOST: ENV.DB_HOST,
    DB_PORT: ENV.DB_PORT,
    DB_USER: ENV.DB_USER,
    DB_DATABASE: ENV.DB_DATABASE,
    DB_TYPE: ENV.DB_TYPE,
    REDIS_URL: ENV.REDIS_URL,
    AI_AGENT_API: ENV.AI_AGENT_API,
    CORS_ORIGIN: ENV.CORS_ORIGIN,
    API_URL: ENV.API_URL,
    LOG_LEVEL: ENV.LOG_LEVEL,
    LOG_FORMAT: ENV.LOG_FORMAT,
    MONGO_URI: ENV.MONGO_URI
  };
  
  console.log(safeEnv);
}