import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import rateLimit from "express-rate-limit";
import logger from "./config/logger";
import swaggerSpec from "./config/swagger";
import { ENV } from "./config/env";
import pool from "./config/db"; // ✅ Database connection for cleanup
import { checkAIServiceHealth } from "./services/ai.service"; // ✅ AI-Agent Health Check Function

// ✅ Import API Routes
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import queryRoutes from "./routes/query.routes";
import userdbRoutes from "./routes/userdb.routes";
import dbRoutes from "./routes/db.routes";

const app = express();

// ✅ Security Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" })); // ✅ Prevent large payloads
app.use(morgan("combined"));

// ✅ API Rate Limiting (Prevents API abuse)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: "Too many requests, please try again later." },
});
app.use("/api", apiLimiter);

// ✅ Swagger API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ Register API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/databases", userdbRoutes);
app.use("/api/db", dbRoutes);

// ✅ AI-Agent Health Check Endpoint
/**
 * @swagger
 * /api/health/ai-agent:
 *   get:
 *     summary: Checks AI-Agent Network health
 *     description: Ensures the AI-Agent API is responsive.
 */
app.get("/api/health/ai-agent", async (req: Request, res: Response) => {
  try {
    const healthStatus = await checkAIServiceHealth();
    res.json({ status: "✅ AI-Agent is online", details: healthStatus });
  } catch (error) {
    res.status(500).json({ error: "❌ AI-Agent is unavailable." });
  }
});

// ✅ Global Error Handling Middleware (Fixed TypeScript Issues)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`❌ Error: ${err.message}`);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// ✅ Graceful Shutdown Handling
process.on("SIGINT", async () => {
  logger.info("⚠️ Shutting down server...");
  await pool.end(); // ✅ Closes database connections
  logger.info("✅ Database connections closed.");
  process.exit(0);
});

export default app;
