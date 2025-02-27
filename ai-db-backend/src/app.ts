// src/app.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from './config/logger';

// Swagger imports
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';

// Import your routes
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/user.routes';
import queryRoutes from './routes/query.routes';
import dbRoutes from './routes/db.routes'; // We'll create this next

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(helmet());
app.use(
  morgan('combined', {
    stream: { write: (message: string) => logger.info(message.trim()) },
  })
);

// Swagger UI setup at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/query', queryRoutes);
app.use('/api', dbRoutes); // DB test endpoint route

// Basic error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error(err);
    res.status(500).json({ message: 'An internal server error occurred' });
  }
);

export default app;
