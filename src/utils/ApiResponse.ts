// src/utils/ApiResponse.ts
import { Response } from 'express';

export interface ApiResponseBody<T = unknown> {
  status: number;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: Record<string, unknown>,
) {
  const body: ApiResponseBody<T> = { status: statusCode, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T, message = 'Created') {
  return sendSuccess(res, data, message, 201);
}
