// src/modules/users/users.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import { updateRoleSchema, createUserSchema } from './users.schema';
import { list, getById, updateRole, remove, create } from './users.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize(['ADMIN']), list);
router.post('/', authorize(['ADMIN']), validate(createUserSchema), create);
router.get('/:id', authorize(['ADMIN', 'MANAGER']), getById);
router.patch('/:id/role', authorize(['ADMIN']), validate(updateRoleSchema), updateRole);
router.delete('/:id', authorize(['ADMIN']), remove);

export default router;
