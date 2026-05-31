// src/modules/tasks/tasks.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import {
  createTaskSchema, updateTaskSchema, updateStatusSchema, listTasksQuerySchema,
} from './tasks.schema';
import { list, getById, create, update, updateStatus, remove } from './tasks.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize(['ADMIN', 'MANAGER', 'MEMBER']), validate(listTasksQuerySchema, 'query'), list);
router.get('/:id', authorize(['ADMIN', 'MANAGER', 'MEMBER']), getById);
router.post('/', authorize(['ADMIN', 'MANAGER']), validate(createTaskSchema), create);
router.delete('/:id', authorize(['ADMIN']), remove);
router.patch('/:id', authorize(['ADMIN', 'MANAGER', 'MEMBER']), validate(updateTaskSchema), update);
router.patch('/:id/status', authorize(['ADMIN', 'MANAGER', 'MEMBER']), validate(updateStatusSchema), updateStatus);

export default router;
