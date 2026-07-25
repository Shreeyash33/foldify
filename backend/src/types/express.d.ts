import type { User } from '@foldify/shared';

/**
 * Adds `req.user` to Express's Request type, populated by requireAuth.
 * Optional, because it is absent on every unauthenticated route.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
