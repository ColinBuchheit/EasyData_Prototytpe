// src/config/env.ts
import path from "path";
import { logger } from "./logger";

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

// ✅ Collect and Log Missing Env Vars Instead of Exiting on First One
const missingVars = REQUIRED_ENV_VARS.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
    logger.error(`❌ Missing critical environment variables: ${missingVars.join(", ")}. Application cannot start.`);
    process.exit(1);
}

// ✅ Helper Function for Safe Env Retrieval
const getEnvVar = (key: string, required = true): string => {
    const value = process.env[key];
    if (!value && required) {
        logger.error(`❌ Missing required environment variable: ${key}`);
        process.exit(1);
    }
    return value || "";
};

// ✅ Export ENV variables with Defaults
export const ENV = {
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: getEnvVar("JWT_SECRET"),
  ENCRYPTION_KEY: getEnvVar("ENCRYPTION_KEY"),
  DB_HOST: getEnvVar("DB_HOST"),
  DB_PORT: Number(process.env.DB_PORT) || 5432,
  DB_USER: getEnvVar("DB_USER"),
  DB_PASSWORD: getEnvVar("DB_PASSWORD"),
  DB_DATABASE: getEnvVar("DB_DATABASE"),
  DB_TYPE: getEnvVar("DB_TYPE"),
  AI_AGENT_API: process.env.AI_AGENT_API || "https://default-ai-api.com", // ✅ Default fallback
  AI_API_KEY: process.env.AI_API_KEY || "", // ✅ Allow empty if not used
  BACKEND_SECRET: process.env.BACKEND_SECRET || "default-secret", // ✅ Default fallback
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*", // ✅ Added CORS_ORIGIN
  NODE_ENV: process.env.NODE_ENV || "development", // ✅ Added Fix
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379", // ✅ Added Fix
  PROD_API_URL: process.env.PROD_API_URL || "https://api.easydata.com", // ✅ Added Fix
  STAGING_API_URL: process.env.STAGING_API_URL || "https://staging-api.easydata.com", // ✅ Added Fix


};
