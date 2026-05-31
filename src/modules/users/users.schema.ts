// src/modules/users/users.schema.ts
import { z } from 'zod';
import { Role } from '../../models/User';

export const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER'] as [Role, ...Role[]], {
    error: 'Role must be ADMIN, MANAGER, or MEMBER',
  }),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['MANAGER', 'MEMBER'] as [Role, ...Role[]], {
    error: 'Role must be MANAGER or MEMBER',
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
