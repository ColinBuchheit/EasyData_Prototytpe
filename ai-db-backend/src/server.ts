// src/server.ts
import app from './app';
import { PORT } from './config/env';
import logger from './config/logger';

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
