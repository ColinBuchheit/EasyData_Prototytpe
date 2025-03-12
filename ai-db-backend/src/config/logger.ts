// src/config/logger.ts
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { Pool } from "pg";
import { ENV } from "./env";

const { combine, timestamp, printf, colorize } = winston.format;

const enableDBLogging = process.env.LOG_DB === "true";
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

const errorTransport = new DailyRotateFile({
  filename: "logs/error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  zippedArchive: true,
  level: "error",
});

const combinedTransport = new DailyRotateFile({
  filename: "logs/combined-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "50m",
  maxFiles: "14d",
  zippedArchive: true,
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

const logBuffer: { level: string; message: string }[] = [];
const BATCH_INTERVAL = 5000;
const MAX_BATCH_SIZE = 10;

async function logToDatabase(level: string, message: string) {
  if (!enableDBLogging || !pool) return;
  logBuffer.push({ level, message });

  if (logBuffer.length >= MAX_BATCH_SIZE) {
    await flushLogs();
  }
}

async function flushLogs() {
  if (logBuffer.length === 0 || !pool) return;
  const logsToInsert = [...logBuffer];

  try {
    const query = "INSERT INTO logs (level, message, timestamp) VALUES ($1, $2, NOW())";
    await Promise.all(logsToInsert.map(log => pool.query(query, [log.level, log.message])));
    logBuffer.length = 0; // ✅ Clear buffer only on success
  } catch (err) {
    logger.error(`❌ Failed to batch log messages: ${(err as Error).message}`);
  }
}

setInterval(flushLogs, BATCH_INTERVAL);

logger.on("error", (error) => logToDatabase("error", error.message));

process.on("exit", async () => {
  await flushLogs();
  if (pool) {
    await pool.end(); // ✅ Close DB connection
  }
  logger.info("✅ Logs flushed before exit.");
});

export { logger, logToDatabase };
export default logger;