import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit"; // ✅ Ensure this import works
import morgan from "morgan";
import { ENV } from "./config/env";
import { pool } from "./config/db"; // ✅ Fixes TS2613
import logger from "./config/logger";
import authRoutes from "./routes/auth.routes";
import dbRoutes from "./routes/db.routes";
import queryRoutes from "./routes/query.routes";
import userRoutes from "./routes/user.routes";
import userDBRoutes from "./routes/userdb.routes";
import { checkAIServiceHealth } from "./services/ai.service";


const app = express();

// ✅ Middleware
app.use(helmet());
app.use(cors({ origin: ENV.CORS_ORIGIN || "*" })); // ✅ Fixed missing ENV property
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ✅ Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP
});
app.use(limiter);

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/userdb", userDBRoutes);

// ✅ AI-Agent Health Check on Startup
(async () => {
  const isAIOnline = await checkAIServiceHealth();
  if (isAIOnline) {
    logger.info("✅ AI-Agent is online and ready.");
  } else {
    logger.warn("⚠️ AI-Agent is unreachable at startup.");
  }
})();

// ✅ Health Check Endpoint
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ message: "✅ Backend is healthy" });
  } catch (error) {
    res.status(500).json({ message: "❌ Backend is unhealthy" });
  }
});

// ✅ Global Error Handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("❌ Internal Server Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

app.get("/", (_req, res) => {
  res.status(200).json({ message: "✅ API is running on port " + ENV.PORT });
});


export default app;
