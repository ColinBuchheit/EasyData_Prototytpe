// src/app.ts
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import logger from "./config/logger";

// Swagger imports
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";

// Import routes
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/user.routes";
import queryRoutes from "./routes/query.routes";
import aiQueryRoutes from "./routes/query.routes"; // ✅ Ensure AI queries are handled

const app: Application = express();

// ✅ Security middleware should be loaded before request processing
app.use(helmet());
app.use(cors());

// ✅ Enable JSON & URL encoding (body parsing)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Logging middleware
app.use(
  morgan("combined", {
    stream: { write: (message: string) => logger.info(message.trim()) },
  })
);

// ✅ Swagger UI setup
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ Register API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/ai-query", aiQueryRoutes); // ✅ AI query endpoint is explicitly registered

// ✅ Global Error Handling
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error(err);

    if (err.status) {
      res.status(err.status).json({ message: err.message });
    } else {
      res.status(500).json({ message: "An internal server error occurred" });
    }
  }
);

export default app;
