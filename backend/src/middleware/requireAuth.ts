import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.ts';
import { AppError } from '../lib/errors.ts';
import { getUserForSession } from '../lib/session.ts';

/**
 * Reads the session cookie, looks up the session row, attaches `req.user`.
 * Rejects with 401 when there is no valid session.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const sessionId = req.cookies?.[config.sessionCookieName] as string | undefined;
  const user = getUserForSession(sessionId);

  if (user === null) {
    next(AppError.unauthorized());
    return;
  }

  req.user = user;
  next();
}

/**
 * Same lookup, but never rejects — for routes that render differently when
 * signed in (e.g. showing whether the viewer already reviewed a product).
 */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const sessionId = req.cookies?.[config.sessionCookieName] as string | undefined;
  const user = getUserForSession(sessionId);
  if (user !== null) req.user = user;
  next();
}
