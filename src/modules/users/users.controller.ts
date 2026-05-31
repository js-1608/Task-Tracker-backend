// src/modules/users/users.controller.ts
import { Request, Response, NextFunction } from 'express';
import { listUsers, getUserById, updateUserRole, deleteUser, createUser } from './users.service';
import { sendSuccess, sendCreated } from '../../utils/ApiResponse';

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users in the organization
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await listUsers(req.user!.orgId);
    sendSuccess(res, users);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getUserById(req.user!.orgId, req.params['id'] as string);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await updateUserRole(
      req.user!.orgId,
      req.params['id'] as string,
      req.body.role,
      req.user!.userId,
    );
    sendSuccess(res, user, 'Role updated successfully');
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteUser(req.user!.orgId, req.params['id'] as string, req.user!.userId);
    sendSuccess(res, null, 'User removed from organization');
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await createUser(req.user!.orgId, req.body);
    sendCreated(res, user, 'Member added successfully');
  } catch (err) {
    next(err);
  }
}
