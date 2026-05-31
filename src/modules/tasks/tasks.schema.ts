// src/modules/tasks/tasks.schema.ts
import { z } from 'zod';
import { Priority, TaskStatus } from '../../models/Task';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'] as [Priority, ...Priority[]]).default('MEDIUM'),
  assigneeId: z.string().min(1).optional(),
  projectId: z.string().min(1, 'projectId is required'),
  dueDate: z
    .string()
    .datetime({ message: 'dueDate must be a valid ISO 8601 datetime' })
    .optional()
    .refine((date) => !date || new Date(date) > new Date(), 'due_date must be a future date'),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'] as [Priority, ...Priority[]]).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .refine((date) => !date || new Date(date) > new Date(), 'due_date must be a future date'),
});

export const updateStatusSchema = z.object({
  status: z.enum(
    ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as [TaskStatus, ...TaskStatus[]],
    { error: 'status must be one of: TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED' },
  ),
});

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as [TaskStatus, ...TaskStatus[]]).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'] as [Priority, ...Priority[]]).optional(),
  assigneeId: z.string().optional(),
  projectId: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
