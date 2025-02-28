// src/server.ts
import app from './app';
import { ENV } from './config/env';  // ✅ Use ENV instead of direct import
import logger from './config/logger';

// Start the server
app.listen(ENV.PORT, () => {
  logger.info(`🚀 Server running on port ${ENV.PORT}`);
});
