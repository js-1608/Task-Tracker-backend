// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { registerService, loginService, refreshService, logoutService } from './auth.service';
import { sendSuccess, sendCreated } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new organization and admin user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Registered successfully
 *       409:
 *         description: Email already taken
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await registerService(req.body);
    sendCreated(res, result, 'Registration successful');
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and receive JWT tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Bad Request / Validation error
 *       401:
 *         description: Invalid credentials
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await loginService(req.body);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rotate refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshInput'
 *     responses:
 *       200:
 *         description: Token refreshed
 *       400:
 *         description: Bad Request / Validation error
 *       401:
 *         description: Invalid/expired refresh token
 */
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refreshService(req.body.refreshToken);
    sendSuccess(res, result, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Revoke refresh token (logout)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw ApiError.badRequest('refreshToken is required');
    await logoutService(refreshToken);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}
