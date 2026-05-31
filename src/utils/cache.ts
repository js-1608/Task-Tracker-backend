// src/utils/cache.ts
import { redis } from '../config/redis';
import { logger } from './logger';

const DEFAULT_TTL = 300; // 5 minutes

// ─── Key builders ────────────────────────────────────────────────────────────
export const CacheKeys = {
  taskList: (orgId: string, assigneeId?: string, page?: number, limit?: number, extra?: string) =>
    `cache:tasks:org:${orgId}:assignee:${assigneeId ?? 'all'}:p${page ?? 1}:l${limit ?? 20}${extra ? ':' + extra : ''}`,
  task: (taskId: string) => `cache:task:${taskId}`,
  projectList: (orgId: string) => `cache:projects:org:${orgId}`,
  userList: (orgId: string) => `cache:users:org:${orgId}`,
};

// ─── Get ──────────────────────────────────────────────────────────────────────
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch (err) {
    logger.warn(`Cache GET failed for key ${key}`, { err });
    return null;
  }
}

// ─── Set ──────────────────────────────────────────────────────────────────────
export async function cacheSet(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    logger.warn(`Cache SET failed for key ${key}`, { err });
  }
}

// ─── Delete single ────────────────────────────────────────────────────────────
export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    logger.warn(`Cache DEL failed for key ${key}`, { err });
  }
}

// ─── Invalidate all task-list caches for an org ───────────────────────────────
// Uses SCAN (not KEYS) to avoid blocking Redis in production
export async function invalidateOrgTaskCache(orgId: string): Promise<void> {
  const pattern = `cache:tasks:org:${orgId}:*`;
  await scanAndDelete(pattern);
}

// ─── Invalidate a specific assignee's task list cache ─────────────────────────
export async function invalidateAssigneeTaskCache(orgId: string, assigneeId: string): Promise<void> {
  const pattern = `cache:tasks:org:${orgId}:assignee:${assigneeId}:*`;
  await scanAndDelete(pattern);
}

// ─── Internal: SCAN + DEL ─────────────────────────────────────────────────────
async function scanAndDelete(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`Cache invalidated ${keys.length} keys matching ${pattern}`);
      }
    } while (cursor !== '0');
  } catch (err) {
    logger.warn(`Cache SCAN+DEL failed for pattern ${pattern}`, { err });
  }
}
