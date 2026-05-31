// src/middlewares/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const error = result.error as ZodError;
      // Zod v4 uses .issues; fall back to .errors for older versions
      const issues = (error as any).issues ?? (error as any).errors ?? [];
      const messages = issues
        .map((e: { path: (string | number)[]; message: string }) =>
          `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return next(ApiError.validationError(messages || error.message));
    }
    // Replace the request part with the parsed (and coerced) data
    if (part === 'query') {
      const queryObj = req.query as Record<string, unknown>;
      for (const key of Object.keys(queryObj)) {
        delete queryObj[key];
      }
      Object.assign(queryObj, result.data);
    } else {
      (req as any)[part] = result.data;
    }
    next();
  };
}
