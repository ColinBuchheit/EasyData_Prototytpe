import winston from "winston";
import { Pool } from "pg";
import { ENV } from "./env";

const { combine, timestamp, printf, colorize } = winston.format;

// ✅ Ensure logs are stored in PostgreSQL if `LOG_DB` is enabled
const enableDBLogging = process.env.LOG_DB === "true";

// ✅ PostgreSQL connection for logging
const pool = enableDBLogging
  ? new Pool({
      host: ENV.DB_HOST,
      port: ENV.DB_PORT,
      user: ENV.DB_USER,
      password: ENV.DB_PASSWORD,
      database: ENV.DB_DATABASE,
      max: 5,
    })
  : null;

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: "info",
  format: combine(colorize(), timestamp(), logFormat),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

// 🔹 Function to Log Errors into Database (Only if Enabled)
async function logToDatabase(level: string, message: string) {
  if (!enableDBLogging || !pool) return; // ✅ Prevent logging if disabled
  try {
    await pool.query(
      "INSERT INTO logs (level, message, timestamp) VALUES ($1, $2, NOW())",
      [level, message]
    );
  } catch (err) {
    console.error("❌ Failed to log message to database:", err);
  }
}

// 🔹 Override Winston Logging to Include Database Storage
logger.on("data", (log) => {
  if (log.level === "error" || log.level === "warn") {
    logToDatabase(log.level, log.message);
  }
});

export { logger, logToDatabase };
export default logger;
