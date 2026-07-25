import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse } from '@foldify/shared';
import { isProduction } from '../config.ts';
import { AppError } from '../lib/errors.ts';

/**
 * The last middleware mounted. Express identifies an error handler by its FOUR
 * parameters — do not remove `_next` even though it is unused.
 *
 * Every failure leaves through here in the same envelope, so the frontend has
 * exactly one error shape to handle. Unexpected exceptions are logged in full
 * server-side and reduced to a generic message client-side: stack traces and
 * raw SQLite messages tell an attacker about your schema.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ApiResponse<never> = { ok: false, error: err.toApiError() };
    res.status(err.status).json(body);
    return;
  }

  console.error('[foldify] unhandled error:', err);

  const body: ApiResponse<never> = {
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'Something went wrong. Please try again.'
        : 'Something went wrong — check the backend console for the stack trace.',
    },
  };
  res.status(500).json(body);
}

/** 404 for anything the router did not match. Mounted just before errorHandler. */
export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiResponse<never> = {
    ok: false,
    error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` },
  };
  res.status(404).json(body);
}

/**
 * Wraps an async route handler so a rejected promise reaches errorHandler.
 * Express 4 does not catch async throws on its own.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
