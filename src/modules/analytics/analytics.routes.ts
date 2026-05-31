// src/modules/analytics/analytics.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { overdueStats } from './analytics.controller';

const router = Router();
router.use(authenticate);
router.get('/overdue', authorize(['ADMIN', 'MANAGER']), overdueStats);

export default router;
