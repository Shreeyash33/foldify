import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.ts';

/**
 * Must be mounted AFTER requireAuth — it assumes `req.user` is already set.
 *   router.use('/admin', requireAuth, requireAdmin, adminRoutes);
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user === undefined) {
    next(AppError.unauthorized());
    return;
  }

  if (req.user.role !== 'admin') {
    next(AppError.forbidden('Admin access required.'));
    return;
  }

  next();
}
