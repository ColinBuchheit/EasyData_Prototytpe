// src/config/env.ts
import dotenv from "dotenv";
import path from "path";

// ✅ Ensure the correct path to .env file dynamically
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ✅ List required environment variables
const REQUIRED_ENV_VARS = [
  "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_DATABASE", "DB_TYPE",
  "JWT_SECRET", "ENCRYPTION_KEY",
  "AI_AGENT_API", "AI_API_KEY", "BACKEND_SECRET"
];

// ✅ Validate required environment variables
REQUIRED_ENV_VARS.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

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
  AI_AGENT_API: process.env.AI_AGENT_API as string,
  AI_API_KEY: process.env.AI_API_KEY as string,
  BACKEND_SECRET: process.env.BACKEND_SECRET as string
};
