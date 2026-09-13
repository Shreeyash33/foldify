import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import type { AdminUser, ApiResponse, ResetPasswordResult, Role, UpdateUserRoleRequest, User } from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import { oneOf, required, validateBody } from '../lib/validate.ts';
import {
  listUsersWithStats,
  getUserById,
  setUserBanned,
  setUserDeleted,
  setUserPassword,
  updateUserRole,
} from '../db/queries/users.queries.ts';
import { asyncHandler } from '../middleware/errorHandler.ts';
import { requireAuth } from '../middleware/requireAuth.ts';
import { requireAdmin } from '../middleware/requireAdmin.ts';

/**
 * Users are an admin-only surface: the list exposes every account's spend and
 * order count, and a role change is the most consequential write in the app.
 * The whole router sits behind requireAuth + requireAdmin.
 */

const ROLES = ['customer', 'admin'] as const;

const router: Router = Router();

router.use(requireAuth, requireAdmin);

/* ---------------------------------------------------------------- WORKING */

/**
 * GET /api/users — admin only. Every account, newest first, with live order
 * count and total spend. The query never selects password_hash.
 */
router.get('/', (_req, res) => {
  const body: ApiResponse<AdminUser[]> = { ok: true, data: listUsersWithStats() };
  res.json(body);
});

/**
 * PATCH /api/users/:id/role — admin only. Promote or demote an account.
 *
 * An admin cannot demote themself — doing so would lock a real account out of
 * the only page that can reverse the decision. Everything else is delegated to
 * the authz middleware above.
 */
router.patch('/:id/role', (req, res) => {
  const id = Number.parseInt(req.params.id ?? '', 10);
  const target = Number.isNaN(id) ? null : getUserById(id);
  if (target === null) throw AppError.notFound('No such user.');

  if (req.user !== undefined && req.user.id === target.id) {
    throw AppError.conflict('You cannot change your own role — you would lock yourself out.');
  }

  const body = validateBody<UpdateUserRoleRequest>(req.body, {
    role: [required, oneOf<Role>(ROLES)],
  });

  const updated = updateUserRole(target.id, body.role);
  if (updated === null) throw AppError.notFound('No such user.');

  const response: ApiResponse<User> = { ok: true, data: updated };
  res.json(response);
});

/**
 * POST /api/users/:id/ban — admin only. Bans (or, with `{ banned: false }`,
 * unbans) an account. Banned accounts cannot log in and their current sessions
 * immediately stop resolving via the session lookup check. An admin cannot ban
 * themself.
 */
router.post('/:id/ban', (req, res) => {
  const id = Number.parseInt(req.params.id ?? '', 10);
  const target = Number.isNaN(id) ? null : getUserById(id);
  if (target === null) throw AppError.notFound('No such user.');
  if (req.user !== undefined && req.user.id === target.id) {
    throw AppError.conflict('You cannot ban your own account.');
  }

  const body = validateBody<{ banned: boolean }>(req.body, {
    banned: [required, booleanFlag],
  });

  const updated = setUserBanned(target.id, body.banned);
  if (updated === null) throw AppError.notFound('No such user.');

  const response: ApiResponse<AdminUser> = { ok: true, data: updated };
  res.json(response);
});

/**
 * POST /api/users/:id/delete — admin only. Soft-deletes (or, with
 * `{ deleted: false }`, restores) an account. The row and its order history
 * are kept because orders point at it; login and sessions are denied like a
 * banned account. An admin cannot delete themself.
 */
router.post('/:id/delete', (req, res) => {
  const id = Number.parseInt(req.params.id ?? '', 10);
  const target = Number.isNaN(id) ? null : getUserById(id);
  if (target === null) throw AppError.notFound('No such user.');
  if (req.user !== undefined && req.user.id === target.id) {
    throw AppError.conflict('You cannot delete your own account.');
  }

  const body = validateBody<{ deleted: boolean }>(req.body, {
    deleted: [required, booleanFlag],
  });

  const updated = setUserDeleted(target.id, body.deleted);
  if (updated === null) throw AppError.notFound('No such user.');

  const response: ApiResponse<AdminUser> = { ok: true, data: updated };
  res.json(response);
});

/**
 * POST /api/users/:id/reset-password — admin only.
 *
 * Generates a random temporary password, stores its hash, and returns the
 * plain text exactly once so the admin can hand it to the account owner. The
 * plain text never touches the database or any log — only the response.
 */
router.post(
  '/:id/reset-password',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id ?? '', 10);
    const target = Number.isNaN(id) ? null : getUserById(id);
    if (target === null) throw AppError.notFound('No such user.');

    const temporaryPassword = crypto.randomBytes(6).toString('base64url'); // ~8 readable chars
    setUserPassword(target.id, await bcrypt.hash(temporaryPassword, 10));

    const response: ApiResponse<ResetPasswordResult> = {
      ok: true,
      data: { temporaryPassword },
    };
    res.json(response);
  }),
);

export default router;

/** A checkbox-style boolean from JSON or a 0/1 integer. */
function booleanFlag(value: unknown, field: string): string | null {
  return value === true || value === false || value === 0 || value === 1
    ? null
    : `${field} must be true or false.`;
}