import { Router } from 'express';
import type { ApiResponse, AuthResponse } from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import { attachUser, requireAuth } from '../middleware/requireAuth.ts';

const router: Router = Router();

/**
 * LAYER RULE: routes/ is HTTP only — parse, validate, call a service or query,
 * respond. No SQL here, no business rules here. See CONTRIBUTING.md.
 */

/* ---------------------------------------------------------------- WORKING */

/**
 * GET /api/auth/me
 * Returns the signed-in user, or `{ user: null }` when there is no session.
 * AuthContext calls this on mount to restore the session, so it must answer
 * 200 for anonymous visitors rather than 401 — a 401 here would make every
 * first page load look like an error in the console.
 */
router.get('/me', attachUser, (req, res) => {
  const body: ApiResponse<{ user: AuthResponse['user'] | null }> = {
    ok: true,
    data: { user: req.user ?? null },
  };
  res.json(body);
});

/* ------------------------------------------------------------------ STUBS */
/*
 * Each stub below is registered so the route exists and answers 501 with a
 * clear message, instead of a confusing 404. Delete the `throw` and implement.
 */

/**
 * POST /api/auth/register
 * Purpose: create a customer account and sign them straight in.
 * Steps:
 *   1. validateBody(req.body, { name: [required, minLength(2)],
 *                               email: [required, isEmail],
 *                               password: [required, minLength(8)] })
 *   2. emailExists(email) -> throw AppError.conflict('That email is already registered.')
 *   3. bcrypt.hash(password, 10)                       // bcryptjs, NOT bcrypt
 *   4. insertUser({ email, name, passwordHash })
 *   5. createSession(user.id) + setSessionCookie(res, sessionId)
 *   6. res.status(201).json({ ok: true, data: { user } })
 */
router.post('/register', () => {
  throw AppError.notImplemented('POST /api/auth/register is not built yet.');
});

/**
 * POST /api/auth/login
 * Purpose: verify credentials, start a session.
 * Steps:
 *   1. validateBody(req.body, { email: [required, isEmail], password: [required] })
 *   2. getUserByEmailWithSecret(email)
 *   3. bcrypt.compare(password, user.passwordHash)
 *      -> on either failure throw the SAME error ('Email or password is incorrect.')
 *         Distinguishing them tells an attacker which emails are registered.
 *   4. createSession + setSessionCookie
 *   5. res.json({ ok: true, data: { user } })
 */
router.post('/login', () => {
  throw AppError.notImplemented('POST /api/auth/login is not built yet.');
});

/**
 * POST /api/auth/logout
 * Purpose: destroy the session row and clear the cookie.
 * Deleting the row matters — clearing the cookie alone leaves a session that
 * still works if anyone kept a copy of the id.
 */
router.post('/logout', requireAuth, () => {
  throw AppError.notImplemented('POST /api/auth/logout is not built yet.');
});

export default router;
