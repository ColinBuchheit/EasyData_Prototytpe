import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
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

// ✅ Log Rotation Configuration
const errorTransport = new DailyRotateFile({
  filename: "logs/error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m", // ✅ Each log file max 20MB
  maxFiles: "14d", // ✅ Keep logs for 14 days
  zippedArchive: true, // ✅ Compress old logs
  level: "error",
});

const combinedTransport = new DailyRotateFile({
  filename: "logs/combined-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "50m", // ✅ Each log file max 50MB
  maxFiles: "14d", // ✅ Keep logs for 14 days
  zippedArchive: true, // ✅ Compress old logs
});

const logger = winston.createLogger({
  level: "info",
  format: combine(colorize(), timestamp(), logFormat),
  transports: [
    new winston.transports.Console(),
    errorTransport,
    combinedTransport,
  ],
});

// 🔹 Buffer for Batch Logging
const logBuffer: { level: string; message: string }[] = [];
const BATCH_INTERVAL = 5000; // ✅ Log to DB every 5 seconds
const MAX_BATCH_SIZE = 10; // ✅ Maximum logs per batch

// 🔹 Function to Log Errors into Database (Batch Processing)
async function logToDatabase(level: string, message: string) {
  if (!enableDBLogging || !pool) return;
  logBuffer.push({ level, message });

  if (logBuffer.length >= MAX_BATCH_SIZE) {
    await flushLogs();
  }
}

// 🔹 Flush Logs to Database
async function flushLogs() {
  if (logBuffer.length === 0 || !pool) return;

  const logsToInsert = [...logBuffer];
  logBuffer.length = 0; // ✅ Clear buffer after copying

  try {
    const query = "INSERT INTO logs (level, message, timestamp) VALUES ($1, $2, NOW())";
    await Promise.all(logsToInsert.map(log => pool.query(query, [log.level, log.message])));
  } catch (err) {
    logger.error(`❌ Failed to batch log messages: ${(err as Error).message}`);
  }
}

// 🔹 Periodically Flush Logs
setInterval(flushLogs, BATCH_INTERVAL);

// 🔹 Override Winston Logging to Include Database Storage
logger.on("data", (log) => {
  if (log.level === "error" || log.level === "warn") {
    logToDatabase(log.level, log.message);
  }
});

process.on("exit", async () => {
  await flushLogs();
  logger.info("✅ Logs flushed before exit.");
});


export { logger, logToDatabase };
export default logger;
