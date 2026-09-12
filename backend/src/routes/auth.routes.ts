import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { ApiResponse, AuthResponse, LoginRequest, RegisterRequest } from '@foldify/shared';
import { config } from '../config.ts';
import {
  emailExists,
  getUserByEmail,
  getUserByEmailWithSecret,
  getUserByIdWithSecret,
  insertUser,
  setUserPassword,
  updateUser,
} from '../db/queries/users.queries.ts';
import { AppError } from '../lib/errors.ts';
import { createSession, clearSessionCookie, destroySession, setSessionCookie } from '../lib/session.ts';
import { isEmail, minLength, optional, required, validateBody } from '../lib/validate.ts';
import { asyncHandler } from '../middleware/errorHandler.ts';
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

/**
 * PATCH /api/auth/me — signed in only.
 * Updates the caller's own account: name, email, and/or password. Every field
 * is optional, and the password change must carry BOTH the current and the
 * new password. Lives here rather than in users.routes.ts because that router
 * is admin-gated; "me" is every signed-in user's own account.
 */
interface UpdateProfileRequest {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = validateBody<UpdateProfileRequest>(req.body, {
      name: [optional(minLength(2))],
      email: [optional(isEmail)],
      currentPassword: [optional(minLength(1))],
      newPassword: [optional(minLength(8))],
    });

    const updatingPassword = body.currentPassword !== undefined || body.newPassword !== undefined;
    if (updatingPassword && (body.currentPassword === undefined || body.newPassword === undefined)) {
      throw AppError.badRequest('Changing your password requires both your current and new password.', {
        currentPassword: 'Both fields are required when changing your password.',
        newPassword: 'Both fields are required when changing your password.',
      });
    }

    // Verify the current password BEFORE touching anything: an attacker who has
    // the session cookie but not the password must not be able to change the
    // account's email or name as a side effect of a failed password attempt.
    if (updatingPassword) {
      const withSecret = getUserByIdWithSecret(req.user!.id);
      if (withSecret === null) throw AppError.notFound('No such user.');
      if (!(await bcrypt.compare(body.currentPassword!, withSecret.passwordHash))) {
        throw AppError.unauthorized('Your current password is incorrect.');
      }
      setUserPassword(req.user!.id, await bcrypt.hash(body.newPassword!, 10));
    }

    const newEmail = body.email?.trim().toLowerCase();
    if (newEmail !== undefined && newEmail !== req.user!.email) {
      const taker = getUserByEmail(newEmail);
      if (taker !== null) throw AppError.conflict('That email is already registered.');
    }

    const updated = updateUser(req.user!.id, { name: body.name, email: body.email });
    if (updated === null) throw AppError.notFound('No such user.');

    const response: ApiResponse<AuthResponse> = { ok: true, data: { user: updated } };
    res.json(response);
  }),
);

/**
 * POST /api/auth/register
 * Creates a customer account and signs them straight in, so the client never
 * has to follow a successful registration with a login round trip.
 * `insertUser` normalises the email, so nothing here trims or lowercases it.
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const body = validateBody<RegisterRequest>(req.body, {
      name: [required, minLength(2)],
      email: [required, isEmail],
      password: [required, minLength(8)],
    });

    if (emailExists(body.email)) {
      throw AppError.conflict('That email is already registered.');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = insertUser({ email: body.email, name: body.name, passwordHash });

    setSessionCookie(res, createSession(user.id));

    const response: ApiResponse<AuthResponse> = { ok: true, data: { user } };
    res.status(201).json(response);
  }),
);

/**
 * POST /api/auth/login
 * Verifies credentials and starts a session.
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = validateBody<LoginRequest>(req.body, {
      email: [required, isEmail],
      password: [required],
    });

    const found = getUserByEmailWithSecret(body.email);
    // One error for both an unknown email and a wrong password: telling them
    // apart turns this endpoint into a list of who has an account.
    const invalid = AppError.unauthorized('Email or password is incorrect.');
    if (found === null) throw invalid;
    if (!(await bcrypt.compare(body.password, found.passwordHash))) throw invalid;

    setSessionCookie(res, createSession(found.id));

    const { passwordHash: _passwordHash, ...user } = found;
    const response: ApiResponse<AuthResponse> = { ok: true, data: { user } };
    res.json(response);
  }),
);

/**
 * POST /api/auth/logout
 * Deletes the session row, then clears the cookie. Clearing the cookie alone
 * would leave a session that still works for anyone who kept a copy of the id.
 */
router.post('/logout', requireAuth, (req, res) => {
  const sessionId = req.cookies?.[config.sessionCookieName] as string | undefined;
  if (sessionId !== undefined) destroySession(sessionId);
  clearSessionCookie(res);

  const response: ApiResponse<{ ok: true }> = { ok: true, data: { ok: true } };
  res.json(response);
});

export default router;
