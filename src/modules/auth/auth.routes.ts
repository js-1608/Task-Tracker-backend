// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';
import { register, login, refresh, logout } from './auth.controller';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', authenticate, logout);

export default router;
