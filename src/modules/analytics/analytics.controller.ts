// src/modules/analytics/analytics.controller.ts
import { Request, Response, NextFunction } from 'express';
import { getOverdueStats } from './analytics.service';
import { sendSuccess } from '../../utils/ApiResponse';

/**
 * @swagger
 * /api/analytics/overdue:
 *   get:
 *     summary: Get overdue task count per user and average completion time
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
export async function overdueStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await getOverdueStats(req.user!.orgId);
    sendSuccess(res, stats, 'Analytics retrieved');
  } catch (err) {
    next(err);
  }
}
