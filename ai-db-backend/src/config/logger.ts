// src/config/logger.ts
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import basicLogger from "./basiclogger";

const { combine, timestamp, printf, colorize, splat, json } = winston.format;

// Check if we should log to console in production
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE !== 'false';
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const LOG_FORMAT = process.env.LOG_FORMAT || "combined";

// Define log format
const logFormat = printf(({ level, message, timestamp, context, ...meta }) => {
  const contextStr = context ? `[${context}] ` : '';
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level}: ${contextStr}${message}${metaStr}`;
});

// Create file transports
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

// Configure transports
const transports: winston.transport[] = [
  errorTransport,
  combinedTransport
];

// Add console transport in development or if explicitly enabled
if (process.env.NODE_ENV !== 'production' || LOG_TO_CONSOLE) {
  transports.push(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    )
  }));
}

// Create the logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    splat(),
    LOG_FORMAT === 'json' ? json() : logFormat
  ),
  transports,
  exitOnError: false
});

// Create context loggers for different components
export function createContextLogger(context: string) {
  const contextLogger = {
    info: (message: string, meta: object = {}) => logger.info(message, { context, ...meta }),
    warn: (message: string, meta: object = {}) => logger.warn(message, { context, ...meta }),
    error: (message: string, meta: object = {}) => logger.error(message, { context, ...meta }),
    debug: (message: string, meta: object = {}) => logger.debug(message, { context, ...meta }),
    verbose: (message: string, meta: object = {}) => logger.verbose(message, { context, ...meta }),
  };

  return contextLogger;
}

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({ filename: 'logs/exceptions.log' })
);

// For backward compatibility, also export the basic logger
export { basicLogger };

// Export the main logger
export default logger;