// src/server.ts
import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { redis } from './config/redis';
import { logger } from './utils/logger';

const PORT = parseInt(env.PORT, 10);

async function main() {
  try {
    await connectDB();
    try {
      await redis.connect();
    } catch (err) {
      logger.warn('⚠️ Redis connection failed. Caching will be disabled/bypassed.', { err });
    }

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📖 Swagger docs at http://localhost:${PORT}/api/docs`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        await disconnectDB();
        try {
          await redis.quit();
        } catch (err) {
          // Ignore connection closed errors on quit
        }
        logger.info('Connections closed. Goodbye.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server', { err });
    process.exit(1);
  }
}

main();
