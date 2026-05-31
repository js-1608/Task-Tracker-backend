// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      status: err.status,
      code: err.code,
      message: err.message,
    });
    return;
  }

  // Prisma known errors
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as { code?: string; meta?: Record<string, unknown> };
    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        status: 409,
        code: 'CONFLICT',
        message: 'A record with this value already exists',
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Record not found',
      });
      return;
    }
  }

  // Unhandled errors
  logger.error('Unhandled error', { err: err.message, stack: err.stack, path: req.path });
  res.status(500).json({
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}
