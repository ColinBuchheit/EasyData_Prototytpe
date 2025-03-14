import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import logger from "./config/logger";

// ✅ Import Routes
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import userdbRoutes from "./routes/userdb.routes";
import queryRoutes from "./routes/query.routes";
import schemaRoutes from "./routes/schema.routes";
import analyticsRoutes from "./routes/analytics.routes";

// ✅ Load environment variables
dotenv.config();

// ✅ Initialize Express App
const app = express();

// ✅ Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/userdb", userdbRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/schema", schemaRoutes);
app.use("/api/analytics", analyticsRoutes);

// ✅ Root API Route
app.get("/", (req, res) => {
  logger.info("✅ API is running");
  res.json({ message: "🚀 EasyData API is running successfully!" });
});

// ✅ Error Handling Middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`❌ Internal Server Error: ${err.message}`);
  res.status(500).json({ message: "Internal Server Error" });
});

// ✅ Export Express App
export default app;
