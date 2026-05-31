// src/modules/tasks/tasks.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from './tasks.service';
import { sendSuccess, sendCreated } from '../../utils/ApiResponse';
import { ListTasksQuery } from './tasks.schema';

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: List tasks with pagination and filters
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [LOW, MEDIUM, HIGH] }
 *       - in: query
 *         name: assigneeId
 *         schema: { type: string, format: uuid }
 */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listTasks(
      req.user!.userId,
      req.user!.role,
      req.user!.orgId,
      req.query as unknown as ListTasksQuery,
    );
          console.log("something else is wrong")

    sendSuccess(res, result.tasks, 'Tasks retrieved', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: (result as any).totalPages,
    });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await getTaskById(
      req.params['id'] as string,
      req.user!.orgId,
      req.user!.userId,
      req.user!.role,
    );
    sendSuccess(res, task);
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskInput'
 *     responses:
 *       201:
 *         description: Task created
 *       400:
 *         description: Bad Request / Validation error
 *       401:
 *         description: Unauthorized
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await createTask(req.user!.orgId, req.user!.userId, req.body);
    sendCreated(res, task, 'Task created');
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await updateTask(
      req.params['id'] as string,
      req.user!.orgId,
      req.user!.userId,
      req.user!.role,
      req.body,
    );
    sendSuccess(res, task, 'Task updated');
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Transition task status (enforced state machine)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStatusInput'
 *     responses:
 *       200:
 *         description: Task status updated
 *       400:
 *         description: Bad Request / Invalid status transition / Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (only assignee, manager, or admin can change status)
 *       404:
 *         description: Task not found
 */
export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await updateTaskStatus(
      req.params['id'] as string,
      req.user!.orgId,
      req.user!.userId,
      req.user!.role,
      req.body,
    );
    sendSuccess(res, task, 'Task status updated');
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteTask(req.params['id'] as string, req.user!.orgId);
    sendSuccess(res, null, 'Task deleted');
  } catch (err) {
    next(err);
  }
}
