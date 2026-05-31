// src/middlewares/authorize.ts
import { Request, Response, NextFunction } from 'express';
import { Role } from '../models/User';
import { ApiError } from '../utils/ApiError';

/**
 * RBAC enforcement at the middleware layer.
 * Controllers never check roles — only this middleware does.
 */
export function authorize(allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role '${req.user.role}' is not permitted. Required: [${allowedRoles.join(', ')}]`,
          'INSUFFICIENT_PERMISSIONS',
        ),
      );
    }
    next();
  };
}
