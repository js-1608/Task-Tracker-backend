// src/modules/projects/projects.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import { createProjectSchema, updateProjectSchema } from './projects.schema';
import { list, getById, create, update, remove } from './projects.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize(['ADMIN', 'MANAGER', 'MEMBER']), list);
router.get('/:id', authorize(['ADMIN', 'MANAGER', 'MEMBER']), getById);
router.post('/', authorize(['ADMIN', 'MANAGER']), validate(createProjectSchema), create);
router.patch('/:id', authorize(['ADMIN', 'MANAGER']), validate(updateProjectSchema), update);
router.delete('/:id', authorize(['ADMIN']), remove);

export default router;
