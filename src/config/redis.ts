// src/config/redis.ts
import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy(times) {
    if (env.NODE_ENV === 'test') {
      return null;
    }
    // Limit reconnection attempts in development
    if (times > 5) {
      logger.warn('⚠️ Redis reconnection limit reached. Caching is disabled.');
      return null;
    }
    // Backoff reconnect interval: 1s, 2s, 3s, 4s, 5s
    return Math.min(times * 1000, 5000);
  },
});

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('error', (err) => logger.error('❌ Redis error', err));
